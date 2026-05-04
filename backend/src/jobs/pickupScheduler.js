import cron from 'node-cron';
import Order from '../models/Order.js';
import User from '../models/User.js';
import ShiprocketService from '../services/ShiprocketService.js';
import Notification from '../models/Notification.js';

/**
 * Smart Pickup Scheduler
 * Runs every 5 minutes to check for orders that need Shiprocket pickup requests.
 */
export const initPickupScheduler = () => {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        console.log('⏰ [SCHEDULER] Checking for scheduled pickups...');
        
        try {
            const now = new Date();
            
            // Find orders that are:
            // 1. Scheduled for pickup
            // 2. Trigger time has passed
            // 3. Status is still 'Assigned' (or 'Pending' if we want to support that)
            const pendingPickups = await Order.find({
                pickupStatus: 'scheduled',
                pickupTriggerTime: { $lte: now },
                status: 'Assigned'
            }).populate('customer vendor');

            if (pendingPickups.length === 0) {
                return;
            }

            console.log(`📦 [SCHEDULER] Found ${pendingPickups.length} orders to trigger Shiprocket API.`);

            for (const order of pendingPickups) {
                try {
                    const customer = order.customer;
                    const isRetail = customer.customerType === 'retail';
                    
                    console.log(`🚚 [SHIPROCKET] Triggering automatic pickup for order: ${order.orderId}`);
                    
                    // 1. Create Return Order (Customer -> Vendor)
                    const srOrder = await ShiprocketService.createReturnOrder(order, customer, !isRetail);
                    
                    if (srOrder && srOrder.shipment_id) {
                        order.shipmentDetails = {
                            shipmentId: srOrder.shipment_id,
                            orderId: srOrder.order_id,
                            isQC: !isRetail,
                            lastStatus: 'CREATED'
                        };
                        
                        // 2. Check Serviceability
                        const pincode = customer.location?.pincode || customer.pincode || '452010';
                        const serviceability = await ShiprocketService.checkServiceability(pincode, !isRetail);
                        
                        if (serviceability?.data?.available_courier_companies?.length > 0) {
                            const bestCourier = serviceability.data.available_courier_companies[0];
                            
                            // 3. Assign AWB
                            const awbData = await ShiprocketService.generateAWB(srOrder.shipment_id, bestCourier.courier_company_id);
                            
                            if (awbData?.response?.data?.awb_code) {
                                order.shipmentDetails.awbCode = awbData.response.data.awb_code;
                                order.shipmentDetails.courierName = bestCourier.courier_name;
                                
                                // 4. Request Pickup
                                const pickupData = await ShiprocketService.generatePickup(srOrder.shipment_id);
                                const token = pickupData?.response?.data?.pickup_token_number || pickupData?.pickup_token_number;
                                
                                if (token) {
                                    order.shipmentDetails.pickupTokenNumber = token;
                                    order.pickupStatus = 'requested';
                                    console.log(`✅ [SCHEDULER] Shiprocket Pickup Requested! Token: ${token}`);
                                    
                                    // Notify Customer
                                    if (customer.fcmToken) {
                                        const admin = (await import('../utils/firebaseAdmin.js')).default;
                                        await admin.messaging().send({
                                            notification: {
                                                title: 'Rider Assigned! 🛵',
                                                body: `A rider is coming for your order ${order.orderId}`
                                            },
                                            token: customer.fcmToken
                                        });
                                    }
                                }
                            }
                        }
                    }
                    
                    await order.save();
                } catch (orderErr) {
                    console.error(`❌ [SCHEDULER] Error processing order ${order.orderId}:`, orderErr.message);
                    
                    // Fallback logic
                    if (order.fallbackEnabled && order.pickupStatus === 'scheduled') {
                        console.log(`🔄 [SCHEDULER] Fallback: Rescheduling order ${order.orderId} for next day.`);
                        const nextDay = new Date(order.pickupTriggerTime);
                        nextDay.setDate(nextDay.getDate() + 1);
                        order.pickupTriggerTime = nextDay;
                        order.pickupStatus = 'rescheduled';
                        await order.save();
                    }
                }
            }
            // --- PART 2: DELIVERY TRIGGERS ---
            const pendingDeliveries = await Order.find({
                deliveryStatus: 'scheduled',
                deliveryTriggerTime: { $lte: now },
                status: 'Ready'
            }).populate('customer vendor');

            if (pendingDeliveries.length > 0) {
                console.log(`📦 [SCHEDULER] Found ${pendingDeliveries.length} deliveries to trigger.`);
                for (const order of pendingDeliveries) {
                    try {
                        console.log(`🚚 [SHIPROCKET] Triggering automatic delivery for order: ${order.orderId}`);
                        const customer = order.customer;
                        
                        // 1. Create Forward Order (Vendor -> Customer)
                        const fwdOrder = await ShiprocketService.createForwardOrder(order, customer);
                        
                        if (fwdOrder && fwdOrder.shipment_id) {
                            order.deliveryShipmentDetails = {
                                shipmentId: fwdOrder.shipment_id,
                                orderId: fwdOrder.order_id,
                                lastStatus: 'CREATED'
                            };
                            
                            // 2. Check Serviceability from Vendor
                            const vPincode = order.vendor?.shopDetails?.pincode || '452010';
                            const serviceability = await ShiprocketService.checkServiceability(vPincode, false);
                            
                            if (serviceability?.data?.available_courier_companies?.length > 0) {
                                const bestCourier = serviceability.data.available_courier_companies[0];
                                
                                // 3. Assign AWB
                                const awbData = await ShiprocketService.generateAWB(fwdOrder.shipment_id, bestCourier.courier_company_id);
                                if (awbData?.response?.data?.awb_code) {
                                    order.deliveryShipmentDetails.awbCode = awbData.response.data.awb_code;
                                    order.deliveryShipmentDetails.courierName = bestCourier.courier_name;
                                    
                                    // 4. Request Pickup from Vendor
                                    const pickupData = await ShiprocketService.generatePickup(fwdOrder.shipment_id);
                                    const token = pickupData?.response?.data?.pickup_token_number || pickupData?.pickup_token_number;
                                    
                                    if (token) {
                                        order.deliveryShipmentDetails.pickupTokenNumber = token;
                                        order.deliveryStatus = 'requested';
                                        order.status = 'Out for Delivery';
                                        console.log(`✅ [SCHEDULER] Shiprocket Delivery Requested! Token: ${token}`);
                                    }
                                }
                            }
                        }
                        await order.save();
                    } catch (delErr) {
                        console.error(`❌ [SCHEDULER] Delivery error for ${order.orderId}:`, delErr.message);
                    }
                }
            }
        } catch (err) {
            console.error('❌ [SCHEDULER] Fatal Error:', err.message);
        }
    });
};
