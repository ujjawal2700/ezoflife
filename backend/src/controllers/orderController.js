import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import axios from 'axios';
import Notification from '../models/Notification.js';
import { calculateTriggerTime } from '../utils/timeUtils.js';
import fs from 'fs';
import { getIO } from '../socket.js';
import { sendWalkInWhatsApp } from '../utils/whatsappHelper.js';
import { sendSMSMessage, sendWhatsAppMessage } from '../utils/communicationHelper.js';
import ShiprocketService from '../services/ShiprocketService.js';
import Razorpay from 'razorpay';
import { calculateOrderPrice } from '../utils/pricingEngine.js';
import MasterService from '../models/MasterService.js';
import Service from '../models/Service.js';


const logToFile = (msg) => {
    try {
        fs.appendFileSync('./REAL_USER_DEBUG.log', `${new Date().toISOString()} - ${msg}\n`);
    } catch (e) {}
};

// Haversine formula to calculate distance between two points in km
const calculateHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

// Google Maps Distance Matrix API call
const calculateGoogleDistance = async (lat1, lon1, lat2, lon2) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    try {
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat1},${lon1}&destinations=${lat2},${lon2}&key=${apiKey}`;
        const response = await axios.get(url);
        if (response.data.status === 'OK' && response.data.rows[0].elements[0].status === 'OK') {
            return response.data.rows[0].elements[0].distance.value / 1000; // in km
        }
        return null;
    } catch (error) {
        console.error('Google Maps API Error:', error);
        return null;
    }
};

export const getNearbyVendors = async (customerLat, customerLng, radiusKm = 4, serviceIds = []) => {
    try {
        const cLat = Number(customerLat);
        const cLng = Number(customerLng);
        const vendors = await User.find({ role: 'Vendor', status: 'approved' });
        const nearbyVendors = [];

        for (const vendor of vendors) {
            // Filter by active services if serviceIds are requested
            if (serviceIds && serviceIds.length > 0) {
                const vendorServices = vendor.shopDetails?.services || [];
                const hasAllServices = serviceIds.every(sId => {
                    const vendorService = vendorServices.find(vs => vs.id === sId || vs._id?.toString() === sId);
                    return vendorService && vendorService.active !== false && vendorService.status === 'approved';
                });
                if (!hasAllServices) continue;
            }

            const vLat = Number(vendor.location?.lat || 0);
            const vLng = Number(vendor.location?.lng || 0);
            let distance = calculateHaversineDistance(cLat, cLng, vLat, vLng);
            if (distance <= radiusKm) {
                nearbyVendors.push({
                    id: vendor._id,
                    name: vendor.shopDetails?.name || vendor.displayName,
                    distance: distance.toFixed(2),
                    location: vendor.location
                });
            }
        }
        return nearbyVendors;
    } catch (err) {
        console.error('Nearby Vendors Error:', err);
        return [];
    }
};

/**
 * Express Controller Wrapper for getNearbyVendors
 */
export const handleGetNearbyVendors = async (req, res) => {
    try {
        const { lat, lng, radius } = req.query;
        if (!lat || !lng) {
            return res.status(400).json({ message: 'Latitude and Longitude are required' });
        }
        const vendors = await getNearbyVendors(lat, lng, radius || 10); // Default 10km for browsing
        res.json(vendors);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const assignVendor = async (customerLat, customerLng) => {
    try {
        const vendors = await User.find({ role: 'Vendor', status: 'approved' });
        if (vendors.length === 0) return null;

        let closestVendor = null;
        let minDistance = Infinity;

        for (const vendor of vendors) {
            const vendorLat = vendor.location?.lat || 0;
            const vendorLng = vendor.location?.lng || 0;

            let distance = await calculateGoogleDistance(customerLat, customerLng, vendorLat, vendorLng);
            if (distance === null) {
                distance = calculateHaversineDistance(customerLat, customerLng, vendorLat, vendorLng);
            }

            if (distance < minDistance) {
                minDistance = distance;
                closestVendor = vendor;
            }
        }

        return closestVendor ? closestVendor._id : null;
    } catch (err) {
        console.error('Vendor Assignment Error:', err);
        return null;
    }
};

export const getNearbyRiders = async (customerLat, customerLng, radiusKm = 4) => {
    try {
        const cLat = Number(customerLat);
        const cLng = Number(customerLng);
        
        const riders = await User.find({ role: 'Rider', status: 'approved' });
        const nearbyRiders = [];

        logToFile(`--- Matching for ${cLat}, ${cLng} (Found ${riders.length} active riders) ---`);

        for (const rider of riders) {
            const rLat = Number(rider.location?.lat || 0);
            const rLng = Number(rider.location?.lng || 0);

            let distance = calculateHaversineDistance(cLat, cLng, rLat, rLng);
            logToFile(`Rider: ${rider.displayName}, Pos: ${rLat},${rLng}, Dist: ${distance.toFixed(3)}km`);
            
            if (distance <= radiusKm) {
                nearbyRiders.push({
                    id: rider._id,
                    distance: distance.toFixed(2),
                    name: rider.displayName
                });
            }
        }
        return nearbyRiders;
    } catch (err) {
        console.error('Nearby Riders Error:', err);
        return [];
    }
};

export const createRazorpayOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;
        console.log('💳 [RAZORPAY] Received request for amount:', amount);

        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            console.error('❌ [RAZORPAY] Keys are missing in .env');
            return res.status(500).json({ message: 'Razorpay keys not configured on server' });
        }
        
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: currency,
            receipt: `receipt_${Date.now()}`
        };

        console.log('💳 [RAZORPAY] Creating order with options:', options);
        const order = await instance.orders.create(options);
        console.log('💳 [RAZORPAY] Order created successfully:', order.id);
        
        res.status(200).json({
            ...order,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('❌ [RAZORPAY] Error:', error);
        res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
    }
};

export const createOrder = async (req, res) => {
    try {
        const { 
            items, 
            pickupSlot, 
            deliverySlot, 
            pickupAddress, 
            pickupLocation, 
            dropAddress, 
            dropLocation, 
            totalAmount, 
            deliveryMode,
            deliveryCharge,
            specialInstructions,
            customerPhotos
        } = req.body;
        const customerId = req.body.customerId; 

        if (!customerId) return res.status(400).json({ message: 'Customer ID required' });

        // 1. Fetch pricing multipliers from SystemConfig
        const SystemConfig = (await import('../models/SystemConfig.js')).default;
        const [
            expressMult,
            platformMult,
            gstPerc,
            advanceConfig
        ] = await Promise.all([
            SystemConfig.findOne({ key: 'express_multiplier' }),
            SystemConfig.findOne({ key: 'platform_multiplier' }),
            SystemConfig.findOne({ key: 'gst_percent' }),
            SystemConfig.findOne({ key: 'advance_percentage' })
        ]);

        const rawExpressMultiplier = req.body.expressMultiplier !== undefined ? Number(req.body.expressMultiplier) : null;
        const normalizedExpressMultiplier = rawExpressMultiplier !== null 
            ? (deliveryMode === 'Express' ? rawExpressMultiplier : 1) 
            : (deliveryMode === 'Express' ? (Number(expressMult?.value) || 1.5) : 1);

        const rawPlatformMultiplier = req.body.platformMultiplier !== undefined ? Number(req.body.platformMultiplier) : null;
        const normalizedPlatformMultiplier = rawPlatformMultiplier !== null ? (1 + rawPlatformMultiplier) : (Number(platformMult?.value) || 1.1);

        const multipliers = {
            expressMultiplier: normalizedExpressMultiplier,
            platformMultiplier: normalizedPlatformMultiplier,
            gstPercent: Number(gstPerc?.value) || 18,
            advancePerc: Number(advanceConfig?.value) || 100,
            areaMultiplier: req.body.areaMultiplier || 1 // Should be passed from frontend based on location
        };

        // 2. Calculate Pricing for each item and overall
        let totalCalculatedV = 0;
        let totalGstAmount = 0;
        let finalPriceBreakdown = {
            baseWithArea: 0,
            expressSurcharge: 0,
            platformFee: 0,
            logisticsFee: Number(deliveryCharge) || 0,
            gstAmount: 0
        };

        const processedItems = items.map(item => {
            const pricing = calculateOrderPrice({
                baseRate: item.price * item.quantity,
                areaMultiplier: multipliers.areaMultiplier,
                expressMultiplier: multipliers.expressMultiplier,
                platformMultiplier: multipliers.platformMultiplier,
                logisticsFee: 0, // Logistics is added once at the end
                gstPercent: multipliers.gstPercent
            });

            // Aggregate breakdown
            finalPriceBreakdown.baseWithArea += pricing.breakdown.baseWithArea;
            finalPriceBreakdown.expressSurcharge += pricing.breakdown.expressSurcharge;
            finalPriceBreakdown.platformFee += pricing.breakdown.platformFee;
            
            totalCalculatedV += pricing.V;
            return { ...item, pricing };
        });

        // --- DROP-OFF CALCULATION ---
        const itemIds = items.map(i => i.serviceId);
        const [masterSvcs, customSvcs] = await Promise.all([
            MasterService.find({ _id: { $in: itemIds.filter(id => id && id.length > 20) } }).select('completionTime gst heritageGst tier'),
            Service.find({ _id: { $in: itemIds.filter(id => id && id.length > 20) } }).select('completionTime gst tier')
        ]);
        const allSvcs = [...masterSvcs, ...customSvcs];
        const maxServiceTime = allSvcs.reduce((max, svc) => Math.max(max, svc.completionTime || 1), 1);
        
        // Auto-calculate drop-off date if not provided or to validate
        const pickupDateObj = new Date(pickupSlot.date);
        const dropOffDate = new Date(pickupDateObj);
        dropOffDate.setDate(dropOffDate.getDate() + maxServiceTime);
        
        // Update deliverySlot date if it was empty or just for consistency
        if (!deliverySlot.date) {
            deliverySlot.date = dropOffDate.toISOString().split('T')[0];
        }

        // Smart Pickup Logic
        const now = new Date();
        const currentHour = now.getHours();
        let pickupExpectedDate = new Date();
        let fallbackEnabled = false;

        if (currentHour < 12) {
            // Morning: Same day
        } else if (currentHour < 15) {
            // Afternoon: Try same day, fallback enabled
            fallbackEnabled = true;
        } else {
            // Evening/Night: Next day
            pickupExpectedDate.setDate(pickupExpectedDate.getDate() + 1);
        }

        const triggerTime = calculateTriggerTime(pickupSlot?.date, pickupSlot?.time);

        // Add logistics to V once
        // Build a map of service DB details
        const serviceDetailsMap = {};
        allSvcs.forEach(s => {
            if (s && s._id) {
                serviceDetailsMap[s._id.toString()] = s;
            }
        });

        // Compute dynamic item-specific GST on backend
        let itemsGstTotal = 0;
        processedItems.forEach(item => {
            const dbSvc = serviceDetailsMap[item.serviceId?.toString()];
            const dbGst = dbSvc ? dbSvc.gst : null;
            const itemTier = dbSvc ? dbSvc.tier : 'Essential';
            const activeTier = selectedTier || req.body.selectedTier || itemTier || 'Essential';
            
            const itemGstPercent = activeTier === 'Heritage' 
              ? (dbSvc?.heritageGst !== undefined && dbSvc?.heritageGst !== null ? dbSvc.heritageGst : 18)
              : (dbGst !== undefined && dbGst !== null ? dbGst : 5);
              
            const itemBase = item.pricing ? item.pricing.breakdown.baseWithArea : (item.price * item.quantity);
            const expressSurcharge = item.pricing ? item.pricing.breakdown.expressSurcharge : 0;
            const taxableValue = itemBase + expressSurcharge;
            itemsGstTotal += taxableValue * (itemGstPercent / 100);
        });

        const finalV = totalCalculatedV + finalPriceBreakdown.logisticsFee;
        const finalGst = itemsGstTotal;
        finalPriceBreakdown.gstAmount = finalGst;

        const finalTotal = finalV + finalGst;
        const calculatedAdvance = (finalTotal * (multipliers.advancePerc / 100));
        const calculatedDue = finalTotal - calculatedAdvance;

        const newOrder = new Order({
            customer: customerId,
            items,
            pickupSlot,
            deliverySlot,
            pickupAddress,
            pickupLocation,
            dropAddress,
            dropLocation,
            totalAmount: Math.round(finalTotal),
            advanceAmount: Math.round(calculatedAdvance),
            dueAmount: Math.round(calculatedDue),
            deliveryMode: deliveryMode || 'Normal',
            deliveryCharge: Number(deliveryCharge) || 0,
            promoApplied: req.body.promoApplied || null,
            discountAmount: req.body.discountAmount || 0,
            specialInstructions: specialInstructions || '',
            customerPhotos: customerPhotos || [],
            priceBreakdown: finalPriceBreakdown,
            status: 'Pending',
            pickupExpectedDate: pickupExpectedDate,
            pickupTriggerTime: triggerTime,
            deliveryStatus: 'none',
            serviceTime: maxServiceTime,
            fallbackEnabled: fallbackEnabled,
            pickupStatus: 'none'
        });

        await newOrder.save();

        // Commented out to avoid broadcasting to vendors with inactive services
        // const io = getIO();
        // io.to('vendors_pool').emit('new_order_available', {
        //     orderId: newOrder._id,
        //     displayId: newOrder.orderId,
        //     distance: 'Global'
        // });
        // logToFile(`Global broadcast sent for Order ${newOrder.orderId}`);

        const io = getIO();
        const serviceIds = items.map(item => item.serviceId);
        const nearbyVendors = await getNearbyVendors(pickupLocation.lat, pickupLocation.lng, 3, serviceIds);

        const notifications = nearbyVendors.map(vendor => ({
            recipient: vendor.id,
            role: 'vendor',
            title: 'New Order Available',
            message: `A new laundry request at ${pickupAddress}. Distance: ${vendor.distance}km.`,
            type: 'order_available',
            orderId: newOrder._id
        }));

        if (notifications.length > 0) {
            try {
                await Notification.insertMany(notifications);
                
                nearbyVendors.forEach(v => {
                    logToFile(`Broadcasting to vendor room: user_${v.id}`);
                    io.to(`user_${v.id}`).emit('new_order_available', {
                        orderId: newOrder._id,
                        displayId: newOrder.orderId,
                        distance: v.distance,
                        items: newOrder.items,
                        tier: newOrder.items[0]?.tier || 'Essential',
                        deliveryMode: newOrder.deliveryMode,
                        notes: newOrder.specialInstructions,
                        totalAmount: newOrder.totalAmount
                    });
                });
                // --- REAL FIREBASE PUSH NOTIFICATION FOR VENDORS ---
                try {
                    const admin = (await import('../utils/firebaseAdmin.js')).default;
                    const vendorIds = nearbyVendors.map(v => v.id);
                    console.log(`📡 [FCM_DEBUG] Found ${vendorIds.length} nearby vendors:`, vendorIds);
                    
                    // Filter: Only notify APPROVED vendors
                    const vendorUsers = await User.find({ 
                        _id: { $in: vendorIds },
                        status: 'approved'
                    });

                    for (const vendorUser of vendorUsers) {
                        if (vendorUser.fcmToken) {
                            console.log(`🚀 [FCM_PUSH] Sending New Order to Vendor: ${vendorUser.phone} | Token: ${vendorUser.fcmToken.substring(0, 15)}...`);
                            const message = {
                                notification: {
                                    title: 'New Order Available! 🧺',
                                    body: `you have received new order`
                                },
                                data: {
                                    orderId: newOrder._id.toString(),
                                    type: 'NEW_ORDER'
                                },
                                token: vendorUser.fcmToken
                            };
                            await admin.messaging().send(message);
                            console.log(`🚀 [FCM_PUSH] Vendor Push Success for ${vendorUser.phone}`);
                        } else {
                            console.log(`⚠️ [FCM_PUSH] Vendor ${vendorUser.phone} has NO FCM Token`);
                        }
                    }
                } catch (pushErr) {
                    console.error('❌ [FCM_PUSH] Vendor notification error:', pushErr.message);
                }
            } catch (notifErr) {
                console.error('Notification Insert Error:', notifErr.message);
            }
        }

        res.status(201).json(newOrder);
    } catch (err) {
        res.status(500).json({ message: 'Error creating order', error: err.message });
    }
};

export const getMyOrders = async (req, res) => {
    try {
        const { customerId } = req.query;
        if (!customerId) return res.status(400).json({ message: 'Customer ID required' });

        logToFile(`[DEBUG] Fetching orders for CustomerID: ${customerId}. Detecting phone...`);

        // Phase 1: Get the current user to find their phone number
        const currentUser = await User.findById(customerId);
        if (!currentUser) {
            logToFile(`[DEBUG] ERROR: User not found for ID: ${customerId}`);
            return res.status(404).json({ message: 'User not found' });
        }

        if (!currentUser.phone) {
            logToFile(`[DEBUG] WARNING: User ${customerId} has NO phone number. Fallback to ID search.`);
            const orders = await Order.find({ customer: customerId }).sort({ createdAt: -1 });
            return res.status(200).json(orders);
        }

        logToFile(`[DEBUG] Found phone: ${currentUser.phone} for account ${customerId}`);

        // Phase 2: Find ALL user accounts associated with this phone number (normalize to last 10 digits)
        const last10 = currentUser.phone.slice(-10);
        const allUserAccounts = await User.find({ phone: new RegExp(last10 + '$') });
        const accountIds = allUserAccounts.map(acc => acc._id);

        logToFile(`[DEBUG] Cross-account search for ${last10}. Found ${accountIds.length} linked IDs.`);

        // Phase 3: Fetch all orders for those accounts
        const orders = await Order.find({ customer: { $in: accountIds } })
            .populate('rider', 'displayName phone')
            .populate('vendor', 'shopDetails phone address')
            .sort({ createdAt: -1 });

        logToFile(`[DEBUG] Orders found for ${currentUser.phone}: ${orders.length}`);

        res.status(200).json(orders);
    } catch (err) {
        console.error('Fetch My Orders Error:', err);
        res.status(500).json({ message: 'Error fetching orders' });
    }
};

export const getVendorOrders = async (req, res) => {
    try {
        const { vendorId } = req.query;
        const orders = await Order.find({ vendor: vendorId }).populate('customer', 'displayName phone').sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching vendor orders' });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const order = await Order.findById(id)
            .populate('customer', 'displayName phone address location')
            .populate('vendor', 'shopDetails address location');
            
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const updateData = { status };

        if (status === 'Ready') {
            if (order.orderType === 'Walk-In' && !order.riderDropOff) {
                console.log(`[LOGISTICS] Walk-In Order ${order.orderId} marked as READY (Direct Handover). Skipping rider assignment.`);
                updateData.deliveryStatus = 'none';
                updateData.deliveryTriggerTime = null;
                updateData.nearbyRiders = [];
                updateData.rider = null;
                if (!order.deliveryOtp) {
                    updateData.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
                }
            } else {
                console.log(`[LOGISTICS] Order ${order.orderId} marked as READY. Scheduling delivery trigger...`);
                
                const deliveryTriggerTime = calculateTriggerTime(order.deliverySlot?.date, order.deliverySlot?.time);
                updateData.deliveryTriggerTime = deliveryTriggerTime;
                updateData.deliveryStatus = 'scheduled';

                const vLat = order.vendor?.location?.lat || 22.7196; 
                const vLng = order.vendor?.location?.lng || 75.8577;
                const nearbyRiders = await getNearbyRiders(vLat, vLng, 4);
                updateData.nearbyRiders = nearbyRiders;
                updateData.rider = null; 
                updateData.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

                const io = getIO();
                
                if (nearbyRiders.length > 0) {
                    // Notifications and Broadcast
                    nearbyRiders.forEach(rider => {
                        const riderRoom = `user_${rider.id.toString()}`;
                        const earnings = 20 + (parseFloat(rider.distance) * 5);
                        
                        console.log(`[LOGISTICS] Sending delivery broadcast to Room: ${riderRoom}`);
                        
                        // Socket broadcast for real-time card
                        io.to(riderRoom).emit('new_pickup_broadcast', {
                            orderId: order.orderId,
                            mongoOrderId: id,
                            mongoId: id,
                            customerName: order.customer?.displayName || 'Customer',
                            pickupAddress: order.vendor?.shopDetails?.address || order.vendor?.address || 'Vendor Shop',
                            dropAddress: order.customer?.address || order.pickupAddress, 
                            distance: rider.distance,
                            earnings: earnings.toFixed(2),
                            type: 'pickup_available'
                        });
                    });

                    // Persistent Notifications
                    const riderNotifs = nearbyRiders.map(rider => ({
                        recipient: rider.id,
                        role: 'rider',
                        title: 'New Delivery Task',
                        message: `Pickup: ${order.vendor?.shopDetails?.address || 'Vendor'} | Drop: ${order.customer?.displayName}`,
                        type: 'pickup_available',
                        orderId: id,
                        payload: {
                            customer: order.customer?.displayName || 'Customer',
                            from: order.vendor?.shopDetails?.address || order.vendor?.address || 'Vendor Shop',
                            to: order.customer?.address || order.pickupAddress,
                            dist: rider.distance,
                            pay: (20 + (parseFloat(rider.distance) * 5)).toFixed(2),
                            displayId: order.orderId
                        }
                    }));
                    await Notification.insertMany(riderNotifs);
                }
            }
        }

        const updatedOrder = await Order.findByIdAndUpdate(id, updateData, { new: true })
            .populate('customer', 'displayName phone address email')
            .populate('vendor', 'shopDetails address location')
            .populate('rider', 'displayName phone location');

        // --- REAL FIREBASE PUSH NOTIFICATION ---
        console.log(`📡 [FCM_DEBUG] updateOrderStatus status: ${status} for order: ${updatedOrder.orderId}`);
        if (status === 'In Progress') {
            let customerId = updatedOrder.customer;
            if (customerId && typeof customerId === 'object') {
                customerId = customerId._id || customerId.id || customerId;
            }
            customerId = customerId?.toString();

            if (customerId) {
                console.log(`📡 [FCM_DEBUG] Found customerId for handover: ${customerId}`);
                try {
                    const admin = (await import('../utils/firebaseAdmin.js')).default;
                    const customer = await User.findById(customerId);
                    
                    if (customer && customer.fcmToken) {
                        console.log(`🚀 [FCM_PUSH] Sending Start Processing Notification to ${customer.phone}`);
                        const message = {
                            notification: {
                                title: 'Service Started! 🧺',
                                body: `your cloth service is start`
                            },
                            data: {
                                orderId: updatedOrder.orderId.toString(),
                                type: 'SERVICE_START'
                            },
                            token: customer.fcmToken
                        };

                        await admin.messaging().send(message);
                        console.log(`🚀 [FCM_PUSH] Start Processing Success`);
                    } else {
                        console.log(`⚠️ [FCM_PUSH] Skipping Handover - Token missing`);
                    }
                } catch (pushErr) {
                    console.error('❌ [FCM_PUSH] Handover error:', pushErr.message);
                }
            }
        }
            
        // Socket.io: Notify rooms
        const io = getIO();
        io.to(`order_${id}`).emit('order_status_update', updatedOrder);
        
        // Also notify vendor specifically for live reports
        if (updatedOrder.vendor) {
            const vendorId = updatedOrder.vendor._id || updatedOrder.vendor;
            io.to(`user_${vendorId}`).emit('order_status_update', updatedOrder);
        }

        res.status(200).json(updatedOrder);
    } catch (err) {
        console.error('Update Status Error:', err);
        res.status(500).json({ message: 'Error updating order status' });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('customer', 'displayName phone').populate('vendor', 'shopDetails phone').sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching all orders' });
    }
};

// Rider Specific Controllers
export const getRiderTasks = async (req, res) => {
    try {
        const { riderId } = req.params;
        const rid = new mongoose.Types.ObjectId(riderId);

        const orders = await Order.find({ 
            $or: [
                { rider: rid },
                { 
                    status: { $in: ['Assigned', 'Ready'] }, 
                    'nearbyRiders.id': rid 
                }
            ]
        }).populate('customer', 'displayName phone address location').sort({ createdAt: -1 });

        console.log(`getRiderTasks for ${riderId}: found ${orders.length} orders`);
        res.status(200).json(orders);
    } catch (err) {
        console.error('Fetch Tasks Error:', err);
        res.status(500).json({ message: 'Error fetching rider tasks' });
    }
};

export const getPoolOrders = async (req, res) => {
    try {
        const { vendorId } = req.query;
        const vendor = await User.findById(vendorId);
        if (!vendor) {
            console.log(`⚠️ [POOL] Vendor lookup FAILED for ID: ${vendorId}`);
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // SECURITY: If vendor is NOT approved, return empty pool
        if (vendor.status !== 'approved') {
            console.log(`🛡️ [POOL_SEC] Blocking pending vendor ${vendor.phone} from seeing orders.`);
            return res.status(200).json([]);
        }

        const vLat = vendor.location?.lat || 0;
        const vLng = vendor.location?.lng || 0;

        // Auto-reject orders older than 1 hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const expiredResult = await Order.updateMany(
            { 
                status: 'Pending', 
                vendor: null, 
                createdAt: { $lt: oneHourAgo } 
            },
            { $set: { status: 'Cancelled' } }
        );

        if (expiredResult.modifiedCount > 0) {
            console.log(`🕒 [EXPIRY] Auto-cancelled ${expiredResult.modifiedCount} stale orders in pool.`);
        }

        // Find all active Pending orders (within 1 hour window)
        const orders = await Order.find({ 
            status: 'Pending', 
            vendor: null,
            createdAt: { $gte: oneHourAgo }
        }).populate('customer', 'displayName address location');
        
        const pool = orders.filter(order => {
            if (!order.pickupLocation?.lat) return false;
            const dist = calculateHaversineDistance(vLat, vLng, order.pickupLocation.lat, order.pickupLocation.lng);
            if (dist > 3) return false; // 3km radius

            // Check if vendor deactivated or doesn't offer any of the order's services
            const serviceIds = order.items.map(item => item.serviceId);
            const vendorServices = vendor.shopDetails?.services || [];
            const hasAllServices = serviceIds.every(sId => {
                const vendorService = vendorServices.find(vs => vs.id === sId || vs._id?.toString() === sId);
                return vendorService && vendorService.active !== false && vendorService.status === 'approved';
            });
            return hasAllServices;
        }).map(o => ({
            ...o._doc,
            distance: calculateHaversineDistance(vLat, vLng, o.pickupLocation.lat, o.pickupLocation.lng).toFixed(2),
            tier: o.items[0]?.tier || 'Essential',
            deliveryMode: o.deliveryMode || 'Normal',
            notes: o.specialInstructions
        }));

        res.status(200).json(pool);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching pool orders' });
    }
};

export const vendorAcceptOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { vendorId } = req.body;
        
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.vendor) return res.status(400).json({ message: 'Order already accepted by another vendor' });

        const vendor = await User.findById(vendorId);
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        // Verify that the vendor has all order services active and approved
        const serviceIds = order.items.map(item => item.serviceId);
        const vendorServices = vendor.shopDetails?.services || [];
        const hasAllServices = serviceIds.every(sId => {
            const vendorService = vendorServices.find(vs => vs.id === sId || vs._id?.toString() === sId);
            return vendorService && vendorService.active !== false && vendorService.status === 'approved';
        });

        if (!hasAllServices) {
            return res.status(400).json({ message: 'You cannot accept this order because some services are inactive or not offered by you.' });
        }

        const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
        const updatedOrder = await Order.findByIdAndUpdate(
            id, 
            { vendor: vendorId, status: 'Assigned', pickupOtp, pickupStatus: 'scheduled' }, 
            { new: true }
        ).populate('customer', 'displayName phone address location');

        // Remove availability notifications for other vendors
        await Notification.deleteMany({ orderId: id, type: 'order_available' });


        // Update nearby riders in order for dashboard listing (Internal Pool)
        const nearbyRiders = await getNearbyRiders(updatedOrder.pickupLocation.lat, updatedOrder.pickupLocation.lng, 4);
        updatedOrder.nearbyRiders = nearbyRiders;
        await updatedOrder.save();


        // Socket.io updates
        const io = getIO();
        
        // Notify all vendors that order is taken
        io.emit('pool_update', { orderId: id, action: 'removed' }); 
        
        // Notify specific riders with EXTENDED DATA
        nearbyRiders.forEach(rider => {
            const earnings = 20 + (parseFloat(rider.distance) * 5);
            io.to(`user_${rider.id}`).emit('new_pickup_broadcast', {
                orderId: updatedOrder.orderId,
                mongoOrderId: id,
                customerName: updatedOrder.customer?.displayName || 'Customer',
                pickupAddress: updatedOrder.pickupAddress,
                dropAddress: vendor?.shopDetails?.address || vendor?.address || 'Vendor Shop',
                distance: rider.distance,
                earnings: earnings.toFixed(2)
            });
        });

        // Notify the CUSTOMER specifically
        let customerId = updatedOrder.customer;
        if (customerId && typeof customerId === 'object') {
            customerId = customerId._id || customerId.id || customerId;
        }
        customerId = customerId?.toString();

        if (customerId) {
            console.log(`🔔 [NOTIFICATION] Notifying Customer: ${customerId}`);
            io.to(`user_${customerId}`).emit('order_status_update', updatedOrder);
            io.to(`user_${customerId}`).emit('push_notification', {
                title: 'Order Accepted! ✅',
                body: `Your order is accepted by vendor`,
                orderId: updatedOrder.orderId
            });

            // --- REAL FIREBASE PUSH NOTIFICATION ---
            try {
                console.log(`📡 [FCM_DEBUG] Starting push process for order: ${updatedOrder.orderId}`);
                const admin = (await import('../utils/firebaseAdmin.js')).default;
                const customer = await User.findById(customerId);
                
                if (customer && customer.fcmToken) {
                    console.log(`📡 [FCM_DEBUG] Found token for ${customer.phone}: ${customer.fcmToken.substring(0, 20)}...`);
                    const message = {
                        notification: {
                            title: 'Order Accepted! ✅',
                            body: `Your order is accepted by vendor`
                        },
                        data: {
                            orderId: updatedOrder.orderId.toString(),
                            type: 'ORDER_ACCEPTED'
                        },
                        token: customer.fcmToken
                    };

                    const response = await admin.messaging().send(message);
                    console.log(`🚀 [FCM_PUSH] Success! Message ID: ${response}`);
                } else {
                    console.log(`⚠️ [FCM_PUSH] Skipping push - Customer or token missing for ID: ${customerId}`);
                }
            } catch (pushErr) {
                console.error('❌ [FCM_PUSH] Error sending push notification:', pushErr.message);
                if (pushErr.stack) console.error(pushErr.stack);
            }
        }

        res.status(200).json(updatedOrder);
    } catch (err) {
        console.error('Vendor Accept Error:', err);
        res.status(500).json({ message: 'Error accepting order' });
    }
};

export const acceptOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const { riderId } = req.body;
        
        // Ensure order isn't already taken
        const order = await Order.findById(id);
        if (order.rider) return res.status(400).json({ message: 'Order already accepted by another rider' });

        // Determine new status: If it was Ready for delivery, it's now Out for Delivery
        const newStatus = order.status === 'Ready' ? 'Out for Delivery' : 'Assigned';

        const updatedOrder = await Order.findByIdAndUpdate(
            id, 
            { rider: riderId, status: newStatus }, 
            { new: true }
        )
        .populate('customer', 'displayName phone address location')
        .populate('rider', 'displayName phone location')
        .populate('vendor', 'shopDetails address location');

        // Remove active task notifications for this order so it doesn't show as a broadcast anymore
        await Notification.deleteMany({ orderId: id, role: 'rider' });

        // Socket.io: Notify Customer room
        const io = getIO();
        io.to(`order_${id}`).emit('order_status_update', updatedOrder);
        io.emit('rider_pool_update', { orderId: id, action: 'removed' });

        // --- REAL FIREBASE PUSH NOTIFICATION ---
        console.log(`📡 [FCM_DEBUG] acceptOrder hit for order: ${updatedOrder.orderId}`);
        let customerId = updatedOrder.customer;
        if (customerId && typeof customerId === 'object') {
            customerId = customerId._id || customerId.id || customerId;
        }
        customerId = customerId?.toString();

        if (customerId) {
            console.log(`📡 [FCM_DEBUG] Found customerId for Rider Assigned: ${customerId}`);
            io.to(`user_${customerId}`).emit('push_notification', {
                title: 'Rider Assigned! 🛵',
                body: `your rider is assigned`,
                orderId: updatedOrder.orderId
            });

            try {
                const admin = (await import('../utils/firebaseAdmin.js')).default;
                const customer = await User.findById(customerId);
                
                if (customer && customer.fcmToken) {
                    console.log(`🚀 [FCM_PUSH] Sending Rider Assigned Notification to ${customer.phone}`);
                    const message = {
                        notification: {
                            title: 'Rider Assigned! 🛵',
                            body: `your rider is assigned`
                        },
                        data: {
                            orderId: updatedOrder.orderId.toString(),
                            type: 'RIDER_ASSIGNED'
                        },
                        token: customer.fcmToken
                    };

                    await admin.messaging().send(message);
                    console.log(`🚀 [FCM_PUSH] Rider Assignment Success`);
                } else {
                    console.log(`⚠️ [FCM_PUSH] Skipping Rider Assigned - Token missing`);
                }
            } catch (pushErr) {
                console.error('❌ [FCM_PUSH] Rider notification error:', pushErr.message);
            }
        }

        res.status(200).json(updatedOrder);
    } catch (err) {
        res.status(500).json({ message: 'Error accepting order' });
    }
};

export const getRiderStats = async (req, res) => {
    try {
        const { riderId } = req.params;
        const orders = await Order.find({ rider: riderId });
        
        const completed = orders.filter(o => o.status === 'Delivered').length;
        const totalEarnings = orders.reduce((sum, o) => sum + (o.totalAmount * 0.05), 0); // 5% commission

        res.status(200).json({
            earnings: `₹${totalEarnings.toFixed(2)}`,
            completed: completed.toString(),
            rating: '4.9' // Placeholder until review system is in place
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching rider stats' });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;
        let query = {};

        if (mongoose.Types.ObjectId.isValid(id)) {
            query._id = id;
        } else {
            // Check for human-readable orderId (e.g. #SZ-8291)
            const cleanId = id.startsWith('#') ? id : `#${id}`;
            query.orderId = cleanId;
        }

        const order = await Order.findOne(query)
            .populate('customer', 'displayName phone address email')
            .populate('vendor', 'shopDetails phone')
            .populate('rider', 'displayName phone');

        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json(order);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching order details', error: err.message });
    }
};

export const verifyPickupOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.pickupOtp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please check with customer.' });
        }

        order.status = 'Picked Up';
        await order.save();
        
        // Remove active task notifications for this order
        await Notification.deleteMany({ orderId: id, role: 'rider' });

        const populatedOrder = await Order.findById(id)
            .populate('customer', 'displayName phone address email')
            .populate('vendor', 'shopDetails address location')
            .populate('rider', 'displayName phone location');

        const io = getIO();
        // Notify others to remove this from their screen
        io.emit('rider_pool_update', { orderId: id, action: 'removed' });
        io.to(`order_${id}`).emit('order_status_update', populatedOrder);

        // Trigger notification to the customer
        io.to(`user_${order.customer}`).emit('push_notification', {
            title: 'Items Picked Up! 👕',
            body: `Rider ${order.rider?.displayName || 'Partner'} has collected your garments.`,
            orderId: order.orderId
        });

        res.status(200).json({ message: 'Pickup verified and completed!', order: populatedOrder });
    } catch (err) {
        res.status(500).json({ message: 'Verification error', error: err.message });
    }
};

/**
 * PHASE 2: Mark Order as Ready & Generate Reverse Handover OTP
 * Vendor -> Rider (Handover)
 */
export const markOrderReady = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        order.status = 'Ready';
        
        let message = 'Order marked as ready. Handover OTP generated for Rider.';
        
        if (order.orderType === 'Walk-In' && !order.riderDropOff) {
            console.log(`[LOGISTICS] Walk-In Order ${order.orderId} marked as READY. Skipping reverse logistics handshake.`);
            if (!order.deliveryOtp) {
                order.deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
            }
            message = 'Order marked as ready for customer self-pickup.';
        } else {
            // Generate Reverse Handshake OTP (Rider provides this to Vendor)
            const handoverOtp = Math.floor(1000 + Math.random() * 9000).toString();
            
            // Add to handshakes array
            order.logisticsHandshakes.push({
                phase: 'Reverse',
                otp: handoverOtp,
                initiator: 'Rider',
                verifier: 'Vendor'
            });

            console.log('\n========================================');
            console.log('🔄 [LOGISTICS] REVERSE HANDSHAKE INITIATED');
            console.log(`📦 Order: ${order.orderId}`);
            console.log(`🔑 RIDER OTP FOR VENDOR: ${handoverOtp}`);
            console.log('========================================\n');
        }

        await order.save();

        const populatedOrder = await Order.findById(id)
            .populate('customer', 'displayName phone address email')
            .populate('vendor', 'shopDetails address location')
            .populate('rider', 'displayName phone location');

        const io = getIO();
        io.to(`order_${id}`).emit('order_status_update', populatedOrder);
        
        // Notify customer
        const notificationBody = (order.orderType === 'Walk-In' && !order.riderDropOff)
            ? `Your garments are ready for self-pickup! Please collect them from the store. Code: ${order.deliveryOtp}`
            : `Vendor has packed your garments. A rider is arriving for delivery.`;

        io.to(`user_${order.customer}`).emit('push_notification', {
            title: 'Your items are ready! ✨',
            body: notificationBody,
            orderId: order.orderId
        });

        res.status(200).json({ 
            message: 'Order marked as ready. Handover OTP generated for Rider.',
            order: populatedOrder 
        });
    } catch (error) {
        console.error('Mark Ready Error:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
};

/**
 * Generic Handshake Verification
 * Can be used for Collection, Reverse, Completion etc.
 */
export const verifyHandshake = async (req, res) => {
    try {
        const { id } = req.params;
        const { phase, otp } = req.body;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const handshake = order.logisticsHandshakes.find(h => h.phase === phase && !h.isVerified);
        if (!handshake) {
            return res.status(400).json({ message: `No active ${phase} handshake found.` });
        }

        if (handshake.otp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Verification failed.' });
        }

        // Mark as verified
        handshake.isVerified = true;
        handshake.verifiedAt = new Date();

        // Update Order Status based on Phase
        if (phase === 'Reverse') {
            order.status = 'Out for Delivery';
            // Generate next phase (Completion) OTP for final delivery to customer
            const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();
            order.deliveryOtp = deliveryOtp; 
            order.logisticsHandshakes.push({
                phase: 'Completion',
                otp: deliveryOtp,
                initiator: 'Rider',
                verifier: 'Customer'
            });
            
            console.log('\n========================================');
            console.log('🏁 [LOGISTICS] FINAL LEG STARTED');
            console.log(`📦 Order: ${order.orderId}`);
            console.log(`🔑 RIDER OTP FOR CUSTOMER: ${deliveryOtp}`);
            console.log('========================================\n');
        }

        if (phase === 'Completion') {
            order.status = 'Delivered';
            
            // Emit completion update (not payment trigger)
            const io = getIO();
            if (io) {
                const customerId = order.customer._id || order.customer;
                const targetRoom = `user_${customerId.toString()}`;
                console.log(`[DEBUG] Notifying customer of delivery in room: ${targetRoom}`);
                io.to(targetRoom).emit('order_status_update', {
                    ...order.toObject(),
                    status: 'Delivered',
                    message: 'Items delivered successfully! Please rate your experience.'
                });
            }

            console.log('\n========================================');
            console.log('✅ [DELIVERY] COMPLETED FOR CUSTOMER');
            console.log(`📦 Order: ${order.orderId}`);
            console.log(`🎯 Target User: ${order.customer.toString()}`);
            console.log('========================================\n');
        }

        await order.save();

        const populatedOrder = await Order.findById(id)
            .populate('customer', 'displayName phone address email')
            .populate('vendor', 'shopDetails address location')
            .populate('rider', 'displayName phone location');

        const io = getIO();
        io.to(`order_${id}`).emit('order_status_update', populatedOrder);
        io.to(`user_${order.customer.toString()}`).emit('order_status_update', populatedOrder);

        res.status(200).json({ message: `${phase} Handshake Verified!`, order: populatedOrder });
    } catch (error) {
        console.error('Handshake Verification Error:', error);
        res.status(500).json({ message: 'Error verifying handshake' });
    }
};

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;

        const order = await Order.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (order.deliveryOtp !== otp) {
            return res.status(400).json({ message: 'Invalid OTP. Please check with customer.' });
        }

        order.status = 'Delivered';
        await order.save();

        // Cleanup notifications
        await Notification.deleteMany({ orderId: id, role: 'rider' });
        
        const populatedOrder = await Order.findById(id)
            .populate('customer', 'displayName phone address email')
            .populate('vendor', 'shopDetails address location')
            .populate('rider', 'displayName phone location');

        const io = getIO();
        // Cleanup for all riders
        io.emit('rider_pool_update', { orderId: id, action: 'removed' });
        io.to(`order_${id}`).emit('order_status_update', populatedOrder);

        res.status(200).json({ message: 'Delivery completed successfully!', order: populatedOrder });
    } catch (err) {
        res.status(500).json({ message: 'Verification error', error: err.message });
    }
};

export const deleteOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findByIdAndDelete(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });
        res.status(200).json({ message: 'Order deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting order', error: err.message });
    }
};
const parseWalkInDeliveryTime = (deliveryTime) => {
    const now = new Date();
    let targetDate = new Date();
    let timeSlot = '06:00 PM - 08:00 PM';

    if (deliveryTime) {
        const timeStr = deliveryTime.toLowerCase();
        if (timeStr.includes('today')) {
            targetDate = now;
            if (timeStr.includes('8 pm')) {
                timeSlot = '08:00 PM - 10:00 PM';
            }
        } else if (timeStr.includes('tomorrow')) {
            targetDate.setDate(now.getDate() + 1);
            if (timeStr.includes('6 pm')) {
                timeSlot = '06:00 PM - 08:00 PM';
            }
        } else if (timeStr.includes('2 days')) {
            targetDate.setDate(now.getDate() + 2);
        }
    } else {
        targetDate.setDate(now.getDate() + 1);
    }

    return {
        date: targetDate.toISOString().split('T')[0],
        time: timeSlot
    };
};

export const createWalkInOrder = async (req, res) => {
    try {
        const { customerPhone, customerName, items, totalAmount, vendorId, riderDropOff, dropAddress, deliveryTime } = req.body;

        if (!customerPhone || !items || !vendorId) {
            return res.status(400).json({ message: 'Missing required fields for walk-in order' });
        }

        // 1. Find or create a shadow user for this walk-in customer
        let customer = await User.findOne({ phone: new RegExp(customerPhone.slice(-10) + '$') });
        
        if (!customer) {
            customer = new User({
                displayName: customerName || `Walk-In (${customerPhone.slice(-4)})`,
                phone: customerPhone,
                role: 'Customer',
                status: 'approved'
            });
            await customer.save();
        } else if (customerName) {
            customer.displayName = customerName;
            await customer.save();
        }

        // 2. Parse delivery slots
        const parsedDeliverySlot = parseWalkInDeliveryTime(deliveryTime);

        // 3. Create the order
        const newOrder = new Order({
            customer: customer._id,
            vendor: vendorId,
            items: items.map(item => ({
                serviceId: item.serviceId || 'walkin',
                name: item.name || item.title,
                quantity: item.quantity || 1,
                price: item.price,
                unit: 'pc'
            })),
            status: 'In Progress', // Direct to progress
            paymentStatus: 'Paid', // Assuming cash/direct payment for walk-in
            totalAmount,
            orderType: 'Walk-In',
            riderDropOff: riderDropOff || false,
            pickupStatus: 'picked',
            pickupExpectedDate: new Date(),
            pickupSlot: {
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString()
            },
            deliverySlot: parsedDeliverySlot,
            pickupAddress: 'Store Walk-In',
            dropAddress: riderDropOff ? dropAddress : 'Store Pickup',
            pickupLocation: { lat: 0, lng: 0 },
            dropLocation: { lat: 0, lng: 0 }
        });

        await newOrder.save();
        
        // Send automated welcome SMS + WhatsApp message containing the Spinzyt app download link
        const welcomeMsg = `Welcome to Spinzyt! Your walk-in order ${newOrder.orderId} has been successfully created. You can track your order status in real-time by downloading the Spinzyt app: https://spinzyt.com/app`;
        await sendSMSMessage(customerPhone, welcomeMsg);
        await sendWhatsAppMessage(customerPhone, welcomeMsg);
        
        // Notify the generated customer shadow account (optional)
        const io = getIO();
        io.to(`user_${customer._id}`).emit('new_order_available', {
            orderId: newOrder._id,
            displayId: newOrder.orderId
        });

        res.status(201).json(newOrder);
    } catch (err) {
        console.error('Walk-In Creation Error:', err);
        res.status(500).json({ message: 'Internal server error', error: err.message });
    }
};
