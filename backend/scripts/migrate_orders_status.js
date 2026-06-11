import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Order from '../src/models/Order.js';

dotenv.config({ path: '../.env' });

const statusMapping = {
    'Pending': 'ORDER_PLACED',
    'Assigned': 'PICKUP_ASSIGNED',
    'Picked Up': 'COLLECTED',
    'In Progress': 'PROCESSING',
    'Ready': 'READY_FOR_DISPATCH',
    'Out for Delivery': 'DELIVERY_IN_PROGRESS',
    'Delivered': 'DELIVERED',
    'Cancelled': 'CANCELLED'
};

const runMigration = async () => {
    try {
        console.log('Connecting to database...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        console.log('Connected.');

        const orders = await Order.find({});
        console.log(`Found ${orders.length} orders to migrate.`);

        let updatedCount = 0;
        for (let order of orders) {
            if (statusMapping[order.status]) {
                order.status = statusMapping[order.status];
                await order.save();
                updatedCount++;
            }
        }

        console.log(`Migration completed successfully. Updated ${updatedCount} orders.`);
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

runMigration();
