import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const seedTestUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('📦 Connected to MongoDB');

        const phone = '6263510091';
        const otp = '123456';
        
        let user = await User.findOne({ phone });
        
        if (user) {
            user.otp = otp;
            user.otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
            user.role = 'Customer';
            user.status = 'approved';
            await user.save();
            console.log(`✅ User ${phone} updated as Customer with OTP ${otp}`);
        } else {
            user = new User({
                phone,
                otp,
                otpExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
                role: 'Customer',
                status: 'approved',
                displayName: 'Test Customer',
                isProfileComplete: true
            });
            await user.save();
            console.log(`✅ User ${phone} created as Customer with OTP ${otp}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seedTestUser();
