import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const seedCustomer = async () => {
    try {
        console.log('🚀 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const phone = '9926723661';
        const otp = '123456';
        
        let user = await User.findOne({ phone });
        
        if (user) {
            console.log(`👤 User with phone ${phone} already exists. Updating OTP...`);
            user.otp = otp;
            user.otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
            user.role = 'Customer';
            user.status = 'approved';
            await user.save();
            console.log('✅ User updated successfully');
        } else {
            console.log(`👤 Creating new customer with phone ${phone}...`);
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
            console.log('✅ New customer registered successfully');
        }

        console.log('\n----------------------------------------');
        console.log(`📱 Phone: ${phone}`);
        console.log(`🔑 OTP: ${otp}`);
        console.log(`👤 Role: ${user.role}`);
        console.log('----------------------------------------\n');

        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding user:', err);
        process.exit(1);
    }
};

seedCustomer();
