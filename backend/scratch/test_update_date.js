import mongoose from 'mongoose';
import B2BOrder from '../src/models/B2BOrder.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find the latest order
    const latestOrder = await B2BOrder.findOne({}).sort({ createdAt: -1 });
    if (!latestOrder) {
        console.log('No B2B orders found to test.');
        await mongoose.disconnect();
        return;
    }
    
    console.log(`Original Delivery Date: ${latestOrder.deliveryDate}`);
    console.log(`Original Delivery Day: ${latestOrder.deliveryDay}`);
    
    // Call PATCH endpoint to change delivery date to June 25, 2026
    const targetDate = '2026-06-25';
    try {
        const res = await fetch(`http://localhost:5001/api/b2b-orders/${latestOrder._id}/delivery-date`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deliveryDate: targetDate })
        });
        const data = await res.json();
        console.log('API RESPONSE:', res.status, data);
        
        // Fetch order again to verify update in database
        const updated = await B2BOrder.findById(latestOrder._id);
        console.log(`Updated Delivery Date in DB: ${updated.deliveryDate}`);
        console.log(`Updated Delivery Day in DB: ${updated.deliveryDay}`);
    } catch (err) {
        console.error('PATCH request failed:', err);
    }
    
    await mongoose.disconnect();
}

run();
