import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order.js';
import User from '../src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find or create a test customer
        let customer = await User.findOne({ phone: '9999988888' });
        if (!customer) {
            customer = new User({
                displayName: 'Test Cancel Customer',
                phone: '9999988888',
                role: 'Customer',
                walletBalance: 500,
                status: 'approved'
            });
            await customer.save();
        } else {
            customer.walletBalance = 500;
            await customer.save();
        }
        console.log(`Initial wallet balance: ₹${customer.walletBalance}`);

        // 2. Create a test order with wallet amount deducted (₹150)
        const order = new Order({
            customer: customer._id,
            items: [
                { serviceId: 'test_item', name: 'Test Shirt Washing', quantity: 2, price: 100 }
            ],
            pickupAddress: '123 Test St',
            dropAddress: '123 Test St',
            totalAmount: 200,
            walletAmountDeducted: 150,
            paymentStatus: 'Paid',
            paymentMethod: 'Online',
            razorpayPaymentId: 'pay_test_payment_123',
            status: 'ORDER_PLACED'
        });
        await order.save();
        console.log(`Created test order ${order.orderId} with status: ${order.status}, wallet deduction: ₹${order.walletAmountDeducted}`);

        // 3. Simulate cancellation logic
        console.log('\n--- Simulating Cancellation ---');
        
        // Fetch order again
        const orderToCancel = await Order.findById(order._id);
        
        // Time validation
        const now = new Date();
        const orderTime = new Date(orderToCancel.createdAt);
        const diffInMinutes = (now.getTime() - orderTime.getTime()) / (1000 * 60);
        console.log(`Time since order placement: ${diffInMinutes.toFixed(2)} minutes`);
        
        if (diffInMinutes > 120) {
            throw new Error('CANCELLATION_FAILED: Exceeded 2 hours');
        }

        // Status validation
        const cancellableStatuses = ['ORDER_PLACED', 'PICKUP_ASSIGNED', 'RIDER_ARRIVING'];
        if (!cancellableStatuses.includes(orderToCancel.status)) {
            throw new Error(`CANCELLATION_FAILED: Status is ${orderToCancel.status}`);
        }

        // Wallet Refund
        let refundLog = '';
        if (orderToCancel.walletAmountDeducted && orderToCancel.walletAmountDeducted > 0) {
            const customerDoc = await User.findById(orderToCancel.customer);
            if (customerDoc) {
                customerDoc.walletBalance = (customerDoc.walletBalance || 0) + orderToCancel.walletAmountDeducted;
                await customerDoc.save();
                refundLog += `Refunded ₹${orderToCancel.walletAmountDeducted} to wallet. `;
            }
        }

        // Razorpay Refund (simulate/mock due to fake payment ID)
        const refundAmount = orderToCancel.totalAmount - (orderToCancel.walletAmountDeducted || 0);
        if (orderToCancel.paymentMethod === 'Online' && orderToCancel.paymentStatus === 'Paid' && orderToCancel.razorpayPaymentId && refundAmount > 0) {
            refundLog += `Simulated refund of ₹${refundAmount} via Razorpay (Payment ID: ${orderToCancel.razorpayPaymentId}).`;
        }

        // Update status
        orderToCancel.status = 'CANCELLED';
        orderToCancel.paymentStatus = 'Refunded';
        await orderToCancel.save();

        console.log('Cancellation processed successfully!');
        console.log(`Refund Log: ${refundLog}`);

        // 4. Verify results
        const updatedCustomer = await User.findById(customer._id);
        const updatedOrder = await Order.findById(order._id);

        console.log('\n--- Verification Results ---');
        console.log(`Updated wallet balance: ₹${updatedCustomer.walletBalance} (Expected: ₹650)`);
        console.log(`Updated order status: ${updatedOrder.status} (Expected: CANCELLED)`);
        console.log(`Updated payment status: ${updatedOrder.paymentStatus} (Expected: Refunded)`);

        // Clean up test order
        await Order.findByIdAndDelete(order._id);
        console.log('\nCleaned up test order.');

    } catch (err) {
        console.error('Test run failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
