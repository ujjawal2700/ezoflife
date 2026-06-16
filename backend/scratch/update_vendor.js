import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const phone = '7612121212';
        const vendor = await User.findOne({ phone });
        if (vendor) {
            console.log('Vendor found. Current details:', {
                id: vendor._id,
                phone: vendor.phone,
                pincode: vendor.pincode,
                shopDetails: vendor.shopDetails
            });

            // Update pincode and shopDetails.pincode
            vendor.pincode = '452001';
            if (!vendor.shopDetails) {
                vendor.shopDetails = {};
            }
            vendor.shopDetails.pincode = '452001';
            if (!vendor.shopDetails.city) {
                vendor.shopDetails.city = 'Indore';
            }
            vendor.city = 'Indore';
            
            // Mark modified if mongoose needs it for nested properties
            vendor.markModified('shopDetails');
            
            await vendor.save();
            console.log('Vendor successfully updated!');
            
            // Retrieve again to verify
            const updatedVendor = await User.findById(vendor._id);
            console.log('Updated details:', {
                id: updatedVendor._id,
                phone: updatedVendor.phone,
                pincode: updatedVendor.pincode,
                city: updatedVendor.city,
                shopDetails: updatedVendor.shopDetails
            });
        } else {
            console.log(`Vendor with phone ${phone} not found`);
        }
        
    } catch (err) {
        console.error('Error updating vendor:', err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
