import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const vendors = await User.find({ role: 'Vendor' }).lean();
        console.log(`Found ${vendors.length} vendors`);
        
        for (const vendor of vendors) {
            console.log(`\nVendor: ${vendor.displayName || vendor.phone} (ID: ${vendor._id})`);
            console.log('Services:', JSON.stringify(vendor.shopDetails?.services, null, 2));
        }
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
