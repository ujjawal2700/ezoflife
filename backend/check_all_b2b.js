import mongoose from 'mongoose';
import B2BOrder from './src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        const allOrders = await B2BOrder.find().lean();
        console.log('Total B2B Orders:', allOrders.length);
        allOrders.forEach(o => {
            console.log(`- ID: ${o.b2bOrderId}, Status: ${o.status}, Pincode: ${o.pincode}, City: ${o.city}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
