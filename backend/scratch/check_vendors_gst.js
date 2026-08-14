import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const MONGO_URI = process.env.MONGODB_URI;

async function check() {
    await mongoose.connect(MONGO_URI);
    
    // Find all approved vendors
    const vendors = await User.find({ role: 'Vendor', status: 'approved' }).lean();
    console.log('--- Approved Vendors ---');
    for (const v of vendors) {
        const gst = v.shopDetails?.gst || v.gstNumber || '';
        console.log(`Vendor: ${v.shopDetails?.name || v.displayName || 'Unnamed'}`);
        console.log(`  ID: ${v._id}`);
        console.log(`  Phone: ${v.phone}`);
        console.log(`  GST Number: "${gst}"`);
        console.log(`  GST Status: ${gst ? 'RD (Registered)' : 'URD (Unregistered)'}`);
        console.log('------------------------');
    }
    
    await mongoose.disconnect();
}
check();
