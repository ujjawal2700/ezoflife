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
    try {
        const { vendorId, items, shippingAddress, totalAmount, pincode, city } = req.body;

        // 1. Get Global Delivery Day
        const config = await SystemConfig.findOne({ key: 'delivery_day' });
        const deliveryDayName = config ? config.value : 'Sunday'; // Default to Sunday

        // 2. Calculate Delivery Date & Cycle
        const deliveryDate = getNextDeliveryDate(deliveryDayName);
        const cycleId = generateCycleId(deliveryDate);

        console.log(`📦 [B2B_AGGREGATION] Processing order for Cycle: ${cycleId}, Date: ${deliveryDate.toDateString()}`);

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
                    // Update price if it changed? For now, we assume it's consistent or we update the total
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

        const searchPincode = pincode?.toString().trim();

        // Check for suppliers in region
        const supplierCount = await User.countDocuments({
            role: 'Supplier',
            status: 'approved',
            $or: [
                { 'supplierDetails.pincode': searchPincode },
                { pincode: searchPincode },
                { 'supplierDetails.city': new RegExp(city?.trim() || '', 'i') }
            ]
        });

        if (supplierCount === 0) {
            return res.status(404).json({ 
                message: 'No approved suppliers currently active in your region.' 
            });
        }

        order = new B2BOrder({
            vendor: vendorId,
            items,
            shippingAddress,
            totalAmount,
            pincode: searchPincode,
            status: 'Open',
            cycleId,
            deliveryDay: deliveryDayName,
            deliveryDate,
            paymentStatus: 'Pending',
            escrowStatus: 'Held'
        });

        await order.save();
        
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

        const pincode = supplier.supplierDetails?.pincode || supplier.pincode;
        const city = supplier.supplierDetails?.city || supplier.city;

        console.log(`📡 [FETCH_POOL] Supplier: ${supplier.displayName} | Pincode: ${pincode}`);

        // Find orders assigned to them OR pending orders in their region with no supplier yet
        const orders = await B2BOrder.find({
            $or: [
                { supplier: supplierId }, // Already claimed
                { 
                    supplier: null, 
                    status: 'Locked',
                    $or: [
                        { pincode: pincode },
                        { city: new RegExp(city || '', 'i') }
                    ]
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

// Update B2B Order Status (Claiming from Pool)
export const updateB2BStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, supplierId } = req.body; // SupplierId is now MANDATORY for claiming

        let order = await B2BOrder.findById(id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Claiming logic
        if (status === 'Accepted' && !order.supplier) {
            // Atomically claim the order
            const claimedOrder = await B2BOrder.findOneAndUpdate(
                { _id: id, supplier: null },
                { status: 'Accepted', supplier: supplierId },
                { new: true }
            );

            if (!claimedOrder) {
                return res.status(400).json({ message: 'Order already claimed by another supplier!' });
            }
            order = claimedOrder;
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
