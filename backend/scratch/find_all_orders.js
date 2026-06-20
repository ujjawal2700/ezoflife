import mongoose from 'mongoose';
import B2BOrder from '../src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    const orders = await B2BOrder.find({}).sort({ createdAt: -1 });
    console.log(`TOTAL B2B ORDERS IN DB: ${orders.length}`);
    orders.forEach(o => {
        console.log(`Order ID: ${o._id}`);
        console.log(`B2B Order ID: ${o.b2bOrderId}`);
        console.log(`Vendor ID: ${o.vendor}`);
        console.log(`Supplier ID: ${o.supplier}`);
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
