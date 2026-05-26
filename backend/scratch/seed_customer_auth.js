import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const phone = '9988776655';
        const otp = '123456';
        const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        let user = await User.findOne({ phone });

        if (user) {
            user.otp = otp;
            user.otpExpiry = otpExpiry;
            user.role = 'Customer';
            user.status = 'approved';
            await user.save();
            console.log(`✅ Updated existing user: ${user.phone} with OTP ${user.otp}`);
        } else {
            user = new User({
                phone,
                otp,
                otpExpiry,
                role: 'Customer',
                status: 'approved',
                displayName: 'Test Customer',
                isProfileComplete: false
            });
            await user.save();
            console.log(`✅ Created new user: ${user.phone} with OTP ${user.otp}`);
        }

        await mongoose.disconnect();
        console.log('👋 Disconnected');
    } catch (err) {
        console.error('❌ Seeding Error:', err);
    }
}

seed();
