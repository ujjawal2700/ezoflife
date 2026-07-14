import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

(async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        const Order = mongoose.connection.collection('orders');
        const firstOrder = await Order.findOne({});
        console.log('--- SAMPLE ORDER STRUCTURE ---', firstOrder);
        
        // Find all orders
        const allOrders = await Order.find({}).toArray();
        console.log(`Total orders in DB: ${allOrders.length}`);
        allOrders.forEach(o => {
            console.log(`Order ID: ${o.orderId || o._id}, customerId: ${o.customerId}, customer: ${o.customer}, Amount: ₹${o.totalAmount}, Status: ${o.status}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
})();
