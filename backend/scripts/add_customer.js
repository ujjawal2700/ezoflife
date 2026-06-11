import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config({ path: '../.env' });

const addCustomer = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        console.log('Connected to database.');

        const phone = '3333333333';
        const otp = '123456';
        const role = 'Customer';

        // Check if user exists
        let user = await User.findOne({ phone });
        if (user) {
            console.log(`User with phone ${phone} already exists. Updating OTP and role...`);
            user.otp = otp;
            user.role = role;
            user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins expiry
            await user.save();
            console.log('User updated successfully.');
        } else {
            console.log(`Creating new user with phone ${phone}...`);
            user = new User({
                phone,
                role,
                otp,
                otpExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 mins expiry
                status: 'approved',
                displayName: 'Test Customer'
            });
            await user.save();
            console.log('User created successfully.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error adding customer:', error);
        process.exit(1);
    }
};

addCustomer();
