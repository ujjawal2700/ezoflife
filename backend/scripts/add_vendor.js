import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config({ path: '../.env' });

const addVendor = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        console.log('Connected to database.');

        const phone = '4444444444';
        const otp = '123456';
        const role = 'Vendor';

        // Check if user exists
        let user = await User.findOne({ phone });
        if (user) {
            console.log(`User with phone ${phone} already exists. Updating OTP and role...`);
            user.otp = otp;
            user.role = role;
            user.status = 'approved'; // Approve directly for testing
            user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
            await user.save();
            console.log('Vendor updated successfully.');
        } else {
            console.log(`Creating new vendor with phone ${phone}...`);
            user = new User({
                phone,
                role,
                otp,
                otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 mins expiry
                status: 'approved',
                displayName: 'Test Vendor',
                shopDetails: {
                    name: 'Test Vendor Shop',
                    address: 'Test Vendor Address',
                    city: 'Bengaluru',
                    pincode: '560102'
                }
            });
            await user.save();
            console.log('Vendor created successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding vendor:', error);
        process.exit(1);
    }
};

addVendor();
