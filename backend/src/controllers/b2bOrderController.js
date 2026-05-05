import B2BOrder from '../models/B2BOrder.js';
import User from '../models/User.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder'
});

// Place B2B Order with Aggregation & Cycle Logic
import SystemConfig from '../models/SystemConfig.js';
import { getNextDeliveryDate, generateCycleId, isBeforeCutoff } from '../utils/cycleHelper.js';

export const placeB2BOrder = async (req, res) => {
    console.log('\n🚨 [B2B_ORDER_INCOMING] ----------------------------------------');
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    try {
        const { vendorId, items, shippingAddress, totalAmount } = req.body;
        
        // 0. Fetch Vendor to get fallback location info
        const vendor = await User.findById(vendorId);
        if (!vendor) return res.status(404).json({ message: 'Vendor not found' });

        const cleanLocation = (val) => {
            if (!val || val === 'Unknown' || val === 'undefined') return null;
            return val.toString().trim();
        };

        const pincode = cleanLocation(req.body.pincode) || cleanLocation(vendor.shopDetails?.pincode) || cleanLocation(vendor.pincode);
        const city = cleanLocation(req.body.city) || cleanLocation(vendor.shopDetails?.city) || cleanLocation(vendor.city);

        // 1. Get Global Delivery Day
        const config = await SystemConfig.findOne({ key: 'delivery_day' });
        const deliveryDayName = config ? config.value : 'Sunday'; // Default to Sunday

        // 2. Calculate Delivery Date & Cycle
        const deliveryDate = getNextDeliveryDate(deliveryDayName);
        const cycleId = generateCycleId(deliveryDate);

        console.log(`📦 [B2B_AGGREGATION] Order Attempt -> Vendor: ${vendor.displayName} | Pincode: ${pincode} | City: ${city}`);

        // 3. Check for existing "Open" order for this vendor in this cycle
        let order = await B2BOrder.findOne({
            vendor: vendorId,
            cycleId: cycleId,
            status: 'Open'
        });

        if (order) {
            console.log(`🔄 [B2B_AGGREGATION] Found existing open order ${order.b2bOrderId}. Aggregating items.`);
            
            // Aggregate items
            items.forEach(newItem => {
                const existingItem = order.items.find(i => i.materialId?.toString() === newItem.materialId?.toString());
                if (existingItem) {
                    existingItem.quantity += newItem.quantity;
                } else {
                    order.items.push(newItem);
                }
            });

            order.totalAmount += Number(totalAmount);
            order.shippingAddress = shippingAddress; // Use latest address
            await order.save();

            return res.status(200).json({ 
                message: 'Items aggregated into your existing delivery cycle!',
                order 
            });
        }

        // 4. No existing order, create new one
        console.log('✨ [B2B_AGGREGATION] No open order found. Creating new one.');

        // Build supplier match query
        const supplierMatch = [];
        if (pincode) {
            supplierMatch.push({ 'supplierDetails.pincode': pincode });
            supplierMatch.push({ pincode: pincode });
        }
        if (city) {
            supplierMatch.push({ 'supplierDetails.city': new RegExp(city, 'i') });
            supplierMatch.push({ city: new RegExp(city, 'i') });
        }

        // Check for suppliers in region
        let supplierCount = 0;
        if (supplierMatch.length > 0) {
            supplierCount = await User.countDocuments({
                role: 'Supplier',
                status: 'approved',
                $or: supplierMatch
            });
        }

        console.log(`🔍 [B2B_MATCH] Regional Supplier Count: ${supplierCount}`);

        // For testing/debugging, we allow creating order even if count is 0, 
        // but we notify in logs. (Or we can keep it strict if you prefer)
        if (supplierCount === 0 && process.env.NODE_ENV === 'production') {
            return res.status(404).json({ 
                message: `No approved suppliers found in your region (${city || pincode || 'Location Unknown'}).` 
            });
        }

        order = new B2BOrder({
            vendor: vendorId,
            items,
            shippingAddress,
            totalAmount,
            pincode: pincode,
            city: city?.trim(),
            status: 'Open',
            cycleId,
            deliveryDay: deliveryDayName,
            deliveryDate,
            paymentStatus: 'Pending',
            escrowStatus: 'Held'
        });

        await order.save();

        // 5. Send Push Notification to regional Suppliers
        try {
            const regionalSuppliers = await User.find({
                role: 'Supplier',
                status: 'approved',
                $or: supplierMatch,
                fcmToken: { $exists: true, $ne: '' }
            });

            if (regionalSuppliers.length > 0) {
                const tokens = regionalSuppliers.map(s => s.fcmToken);
                const notificationMessage = {
                    notification: {
                        title: 'New B2B Order Request',
                        body: `A new order request #${order.b2bOrderId} is available in your region. Accept it now!`
                    },
                    data: {
                        type: 'NEW_B2B_ORDER',
                        orderId: order._id.toString()
                    },
                    tokens: tokens
                };

                const response = await admin.messaging().sendMulticast(notificationMessage);
                console.log(`🚀 [FCM_PUSH] B2B Request Sent to ${response.successCount} regional suppliers.`);
            }
        } catch (pushErr) {
            console.error('❌ [FCM_PUSH] Regional Supplier Notification Error:', pushErr.message);
        }
        
        res.status(201).json({ 
            message: 'Order created for the upcoming delivery cycle!',
            order
        });

    } catch (err) {
        console.error('💥 [B2B_AGGREGATION_ERROR]:', err);
        res.status(500).json({ message: 'Internal server error while placing order', error: err.message });
    }
};

// Get orders for a specific Supplier (Assigned + Regional Pool)
export const getSupplierOrders = async (req, res) => {
    try {
        const { supplierId } = req.params;
        const supplier = await User.findById(supplierId);
        if (!supplier) return res.status(404).json({ message: 'Supplier not found' });

        // DEBUG: Log supplier data to find where the address is stored
        console.log(`🔍 [DEBUG_SUPPLIER] ID: ${supplierId} | Details:`, {
            supplierDetails: supplier.supplierDetails,
            shopDetails: supplier.shopDetails,
            addressCount: supplier.addresses?.length
        });

        const defaultAddress = supplier.addresses?.find(a => a.isDefault) || supplier.addresses?.[0];

        // Search in ALL possible fields
        const pincode = (
            supplier.supplierDetails?.pincode || 
            supplier.shopDetails?.pincode || 
            supplier.pincode || 
            defaultAddress?.pincode
        )?.toString().trim();

        const city = (
            supplier.supplierDetails?.city || 
            supplier.shopDetails?.city || 
            supplier.city || 
            defaultAddress?.city
        )?.trim();

        console.log(`📡 [FETCH_POOL] Supplier Location -> Pincode: ${pincode} | City: ${city}`);

        if (!pincode && !city) {
            console.warn(`⚠️ [FETCH_POOL] Supplier ${supplierId} has NO location data defined.`);
        }

        // Build regional query dynamically
        const regionalQuery = [];
        if (pincode) regionalQuery.push({ pincode: pincode });
        if (city) regionalQuery.push({ city: new RegExp(city, 'i') });

        // Find orders assigned to them OR pending orders in their region with no supplier yet
        const orders = await B2BOrder.find({
            $or: [
                { supplier: supplierId }, // Already claimed
                { 
                    supplier: null, 
                    status: { $in: ['Open', 'Locked', 'Pending'] },
                    $or: regionalQuery.length > 0 ? regionalQuery : [{ _id: null }] // Match nothing if no location
                }
            ]
        })
        .populate('vendor', 'displayName phone shopDetails')
        .sort({ createdAt: -1 });

        console.log(`✅ [FETCH_POOL] Found ${orders.length} potential orders`);
        res.status(200).json(orders);
    } catch (err) {
        console.error('Fetch Pool Error:', err);
        res.status(500).json({ message: 'Error fetching supplier pool' });
    }
};

// Get orders for a specific Vendor
export const getVendorOrders = async (req, res) => {
    const { vendorId } = req.params;
    console.log(`📡 [B2B_FETCH] Fetching orders for Vendor ID: ${vendorId}`);
    try {
        const orders = await B2BOrder.find({ vendor: vendorId })
            .populate('supplier', 'displayName phone supplierDetails')
            .sort({ createdAt: -1 });

        res.status(200).json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching vendor orders' });
    }
};

import admin from '../utils/firebaseAdmin.js';

// Update B2B Order Status (Claiming from Pool)
export const updateB2BStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, supplierId } = req.body; // SupplierId is now MANDATORY for claiming

        let order = await B2BOrder.findById(id).populate('vendor');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const supplier = await User.findById(supplierId);

        // Claiming logic
        if (status === 'Accepted' && !order.supplier) {
            // Atomically claim the order
            const claimedOrder = await B2BOrder.findOneAndUpdate(
                { _id: id, supplier: null },
                { status: 'Accepted', supplier: supplierId },
                { new: true }
            ).populate('vendor');

            if (!claimedOrder) {
                return res.status(400).json({ message: 'Order already claimed by another supplier!' });
            }
            order = claimedOrder;

            // Send Push Notification to Vendor
            if (order.vendor && order.vendor.fcmToken) {
                try {
                    const message = {
                        notification: {
                            title: 'B2B Order Accepted!',
                            body: `Your order is accepted by ${supplier?.displayName || 'a supplier'} and delivery to ${order.deliveryDate.toLocaleDateString()}`
                        },
                        data: {
                            orderId: order._id.toString(),
                            type: 'B2B_ORDER_ACCEPTED'
                        },
                        token: order.vendor.fcmToken
                    };
                    await admin.messaging().send(message);
                    console.log(`🚀 [FCM_PUSH] B2B Acceptance Push Sent to Vendor: ${order.vendor.phone}`);
                } catch (pushErr) {
                    console.error('❌ [FCM_PUSH] B2B Notification Error:', pushErr.message);
                }
            }
        } else {
            // Normal status update
            order.status = status;
            await order.save();
        }
        
        res.status(200).json({ message: `Order marked as ${status}`, order });
    } catch (err) {
        console.error('Update B2B Status Error:', err);
        res.status(500).json({ message: 'Error updating status' });
    }
};

// Bulk update status for multiple B2B orders
export const bulkUpdateB2BStatus = async (req, res) => {
    try {
        const { orderIds, status, supplierId } = req.body;
        if (!Array.isArray(orderIds)) return res.status(400).json({ message: 'Invalid orderIds' });

        const results = await B2BOrder.updateMany(
            { _id: { $in: orderIds }, supplier: supplierId },
            { status: status }
        );

        res.status(200).json({ message: `Successfully updated ${results.modifiedCount} orders to ${status}`, results });
    } catch (err) {
        console.error('Bulk Update Error:', err);
        res.status(500).json({ message: 'Error in bulk update' });
    }
};

// 1. Vendor initiates payment (Razorpay Order creation)
export const initiateB2BPayment = async (req, res) => {
    try {
        const { orderId } = req.body;
        const b2bOrder = await B2BOrder.findById(orderId);

        if (!b2bOrder) return res.status(404).json({ message: 'Order not found' });
        if (b2bOrder.status !== 'Delivered') {
            return res.status(400).json({ message: 'Payment only allowed after product is delivered' });
        }

        const options = {
            amount: b2bOrder.totalAmount * 100, // In paise
            currency: 'INR',
            receipt: `receipt_${b2bOrder.b2bOrderId}`,
            notes: { orderId: b2bOrder._id.toString(), type: 'B2B_ESCROW' }
        };

        const rzpOrder = await razorpay.orders.create(options);
        res.json({ rzpOrder, b2bOrderId: b2bOrder.b2bOrderId });
    } catch (error) {
        console.error('Razorpay Order Error:', error);
        res.status(500).json({ message: 'Failed to create payment order' });
    }
};

// 2. Complete payment tracking
export const verifyB2BPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;
        const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_placeholder');
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generated_signature = hmac.digest('hex');

        if (generated_signature === razorpay_signature) {
            const order = await B2BOrder.findByIdAndUpdate(orderId, {
                paymentStatus: 'Paid',
                escrowStatus: 'Held'
            }, { new: true });
            res.json({ message: 'Payment verified and held in Escrow', order });
        } else {
            res.status(400).json({ message: 'Invalid signature' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 3. Admin releases payment to Supplier
export const releaseSupplierPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await B2BOrder.findById(id);

        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.paymentStatus !== 'Paid') return res.status(400).json({ message: 'Cannot release unpaid order' });

        order.escrowStatus = 'Released';
        order.status = 'Settled';
        await order.save();

        res.json({ message: 'Funds released to supplier successfully', order });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. Admin gets all "Paid & Held" orders for payout management
export const getAdminEscrowOrders = async (req, res) => {
    try {
        const orders = await B2BOrder.find({ paymentStatus: 'Paid' })
            .populate('vendor', 'displayName shopDetails')
            .populate('supplier', 'displayName supplierDetails phone')
            .sort({ updatedAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// Get Supplier Timeline (Live Data)
export const getSupplierTimeline = async (req, res) => {
    try {
        const config = await SystemConfig.findOne({ key: 'delivery_day' });
        const deliveryDayName = config ? config.value : 'Sunday';
        const deliveryDate = getNextDeliveryDate(deliveryDayName);

        // 1. Next Batch Pickup (Usually 24h before delivery)
        const pickupDate = new Date(deliveryDate);
        pickupDate.setHours(pickupDate.getHours() - 24);

        // 2. Next Payment Settlement (Every Friday)
        const settlementDate = new Date();
        const daysUntilFriday = (5 - settlementDate.getDay() + 7) % 7;
        settlementDate.setDate(settlementDate.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
        settlementDate.setHours(10, 0, 0, 0);

        // 3. Rate Submission Deadline (Saturday 6 PM)
        const deadlineDate = new Date();
        const daysUntilSaturday = (6 - deadlineDate.getDay() + 7) % 7;
        deadlineDate.setDate(deadlineDate.getDate() + daysUntilSaturday);
        deadlineDate.setHours(18, 0, 0, 0);

        const timeline = [
            {
                id: 'pickup',
                title: 'Weekend Consolidation',
                desc: 'Bulk batching cycle',
                date: pickupDate,
                icon: 'event_upcoming',
                color: 'indigo',
                variant: 'primary'
            },
            {
                id: 'payment',
                title: 'Payment Settlement',
                desc: 'Weekly payout cycle',
                date: settlementDate,
                icon: 'payments',
                color: 'emerald',
                variant: 'success'
            },
            {
                id: 'deadline',
                title: 'Rate Submission',
                desc: 'Deadline for next cycle',
                date: deadlineDate,
                icon: 'gavel',
                color: 'rose',
                variant: 'danger',
                actionRequired: new Date() > new Date(deadlineDate.getTime() - 6 * 60 * 60 * 1000) // 6 hours before
            }
        ];

        res.status(200).json(timeline);
    } catch (err) {
        console.error('Timeline Error:', err);
        res.status(500).json({ message: 'Error fetching timeline' });
    }
};
