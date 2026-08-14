import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
(async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        const User = mongoose.connection.collection('users');
        const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        
        await User.updateOne(
            { phone: '8888888881' },
            { 
                $set: { 
                    phone: '8888888881', 
                    role: 'Customer', 
                    status: 'approved', 
                    displayName: 'Test Customer 8888888881', 
                    otp: '123456', 
                    otpExpiry: otpExpiry,
                    address: 'Test Address, Indore',
                    isProfileComplete: true
                } 
            },
            { upsert: true }
        );
        console.log('✅ Customer Registered: 8888888881 with OTP 123456');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
