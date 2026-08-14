import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        const User = mongoose.connection.collection('users');
        const otpExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year expiry
        
        await User.updateOne(
            { phone: '5252323232' },
            { 
                $set: { 
                    phone: '5252323232', 
                    role: 'Customer', 
                    status: 'approved', 
                    displayName: 'Customer 5252323232', 
                    otp: '123456', 
                    otpExpiry: otpExpiry,
                    address: 'Test Address, Indore',
                    isProfileComplete: true
                } 
            },
            { upsert: true }
        );
        console.log('✅ Customer Registered: 5252323232 with OTP 123456');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
})();
