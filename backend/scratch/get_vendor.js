import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const vendor = await User.findById('6a27f5b21c44ca01ad2b0912');
        if (vendor) {
            console.log('Vendor Profile details:');
            console.log({
                id: vendor._id,
                phone: vendor.phone,
                displayName: vendor.displayName,
                pincode: vendor.pincode,
                city: vendor.city,
                shopDetails: vendor.shopDetails
            });
        } else {
            console.log('Vendor not found');
        }
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
