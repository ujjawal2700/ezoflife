import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

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
