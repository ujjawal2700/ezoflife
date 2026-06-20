import mongoose from 'mongoose';
import B2BOrder from '../src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    
    // Find all orders created today (June 20, 2026)
    const today = new Date('2026-06-20T00:00:00.000Z');
    const orders = await B2BOrder.find({ createdAt: { $gte: today } }).sort({ createdAt: -1 });
    
    console.log(`FOUND ${orders.length} ORDERS CREATED TODAY:`);
    orders.forEach(o => {
        console.log(`Order ID: ${o._id}`);
        console.log(`B2B Order ID: ${o.b2bOrderId}`);
        console.log(`Status: ${o.status}`);
        console.log(`Platform Fee: ${o.platformFee}`);
        console.log(`Razorpay Order ID: ${o.razorpayOrderId}`);
        console.log(`Payment Status: ${o.paymentStatus}`);
        console.log(`Created At: ${o.createdAt}`);
        console.log('---------------------------------');
    });
    
    await mongoose.disconnect();
}

check().catch(console.error);
