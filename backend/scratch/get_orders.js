import mongoose from 'mongoose';
import B2BOrder from '../src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const orders = await B2BOrder.find().sort({ createdAt: -1 }).limit(5);
        console.log('Recent B2B Orders:');
        orders.forEach(o => {
            console.log({
                id: o._id,
                b2bOrderId: o.b2bOrderId,
                status: o.status,
                paymentStatus: o.paymentStatus,
                platformFee: o.platformFee,
                razorpayOrderId: o.razorpayOrderId,
                createdAt: o.createdAt
            });
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
