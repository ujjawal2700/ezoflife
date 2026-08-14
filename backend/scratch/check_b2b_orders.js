import mongoose from 'mongoose';
import B2BOrder from '../src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const orders = await B2BOrder.find({
            status: { $nin: ['DELIVERED', 'Delivered', 'CANCELLED', 'Cancelled', 'REJECTED'] }
        });
        
        console.log(`Found ${orders.length} active/in-progress orders:`);
        orders.forEach(o => {
            console.log(`- Order: #${o.b2bOrderId} | ID: ${o._id}`);
            console.log(`  Status: ${o.status}`);
            console.log(`  Pincode: ${o.pincode}`);
            console.log(`  Shipping Address: ${o.shippingAddress}`);
            console.log(`  Supplier: ${o.supplier}`);
            console.log('-----------------------------------------');
        });
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
