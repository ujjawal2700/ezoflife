import mongoose from 'mongoose';
import Order from './src/models/Order.js';
import dotenv from 'dotenv';
dotenv.config();

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB. Starting migration...');

        const mapping = {
            'Pending': 'ORDER_PLACED',
            'Assigned': 'PICKUP_ASSIGNED',
            'Picked Up': 'COLLECTED',
            'In Progress': 'PROCESSING',
            'Ready': 'READY_FOR_DISPATCH',
            'Out for Delivery': 'DELIVERY_IN_PROGRESS',
            'Delivered': 'DELIVERED',
            'Cancelled': 'CANCELLED'
        };

        for (const [oldStatus, newStatus] of Object.entries(mapping)) {
            const res = await Order.updateMany({ status: oldStatus }, { $set: { status: newStatus } });
            console.log(`Migrated ${res.modifiedCount} orders from ${oldStatus} to ${newStatus}`);
        }

        console.log('Migration complete.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
