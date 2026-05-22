import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

(async () => {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';
        await mongoose.connect(uri);
        const User = mongoose.connection.collection('users');
        const otpExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year expiry
        
        // Register 9-digit version
        await User.updateOne(
            { phone: '961752332' },
            { 
                $set: { 
                    phone: '961752332', 
                    role: 'Customer', 
                    status: 'approved', 
                    displayName: 'Customer 961752332', 
                    otp: '123456', 
                    otpExpiry: otpExpiry,
                    address: 'Test Address, Indore',
                    isProfileComplete: true
                } 
            },
            { upsert: true }
        );
        console.log('✅ Customer Registered: 961752332 with OTP 123456');

        // Register 10-digit version
        await User.updateOne(
            { phone: '9617523320' },
            { 
                $set: { 
                    phone: '9617523320', 
                    role: 'Customer', 
                    status: 'approved', 
                    displayName: 'Customer 9617523320', 
                    otp: '123456', 
                    otpExpiry: otpExpiry,
                    address: 'Test Address, Indore',
                    isProfileComplete: true
                } 
            },
            { upsert: true }
        );
        console.log('✅ Customer Registered: 9617523320 with OTP 123456');
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
})();
