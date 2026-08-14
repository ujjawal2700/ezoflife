import mongoose from 'mongoose';
import B2BOrder from '../src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Find one order with status Accepted / ACCEPTED
        const order = await B2BOrder.findOne({
            status: { $in: ['ACCEPTED', 'Accepted'] }
        });
        
        if (!order) {
            console.log('No Accepted orders found to test.');
            return;
        }
        
        console.log(`Found Order: #${order.b2bOrderId} | ID: ${order._id}`);
        console.log(`Current Status: ${order.status}`);
        
        // Try updating status to PROCESSING and saving
        order.status = 'PROCESSING';
        console.log('Attempting to save status update...');
        await order.save();
        console.log('Save successful! Status updated to PROCESSING.');
        
        // Revert back so we don't permanently modify it
        order.status = 'ACCEPTED';
        await order.save();
        console.log('Reverted status back to ACCEPTED.');
        
    } catch (err) {
        console.error('Save failed! Error details:');
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
