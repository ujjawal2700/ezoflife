import mongoose from 'mongoose';
import B2BOrder from '../src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Find all orders
        const orders = await B2BOrder.find({});
        console.log(`Found ${orders.length} total orders to check.`);
        
        const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        for (let order of orders) {
            let modified = false;
            
            // Normalize status
            const statusMap = {
                'Submitted': 'SUBMITTED',
                'Accepted': 'ACCEPTED',
                'Confirmed': 'ACCEPTED',
                'Out for Delivery': 'DISPATCHED',
                'Delivered': 'DELIVERED',
                'Cancelled': 'CANCELLED',
                'Settled': 'SETTLED',
                'Pending': 'SUBMITTED',
                'Open': 'SUBMITTED',
                'Locked': 'ACCEPTED'
            };
            
            if (statusMap[order.status]) {
                console.log(`Normalizing status for order #${order.b2bOrderId || order._id}: ${order.status} -> ${statusMap[order.status]}`);
                order.status = statusMap[order.status];
                modified = true;
            }
            
            // Fill missing required fields
            if (!order.deliveryDate) {
                order.deliveryDate = new Date();
                modified = true;
            }
            if (!order.deliveryDay) {
                order.deliveryDay = DAYS[new Date(order.deliveryDate).getDay()];
                modified = true;
            }
            if (!order.cycleId) {
                const year = new Date(order.deliveryDate).getFullYear();
                const month = String(new Date(order.deliveryDate).getMonth() + 1).padStart(2, '0');
                const day = String(new Date(order.deliveryDate).getDate()).padStart(2, '0');
                order.cycleId = `CYC-${year}${month}${day}`;
                modified = true;
            }
            if (!order.pincode) {
                order.pincode = '452001';
                modified = true;
            }
            if (!order.shippingAddress || order.shippingAddress.trim() === ',' || order.shippingAddress.trim() === ', ') {
                order.shippingAddress = 'Vijay Nagar, Indore';
                modified = true;
            }
            
            if (modified) {
                console.log(`Saving updated Order #${order.b2bOrderId || order._id}...`);
                await order.save();
                console.log('Saved successfully.');
            }
        }
        
        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
