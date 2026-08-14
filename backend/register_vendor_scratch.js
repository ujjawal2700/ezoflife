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
            { phone: '9826723551' },
            { 
                $set: { 
                    phone: '9826723551', 
                    role: 'Vendor', 
                    status: 'approved', 
                    displayName: 'Indore Test Vendor', 
                    otp: '123456', 
                    otpExpiry: otpExpiry,
                    isProfileComplete: true,
                    shopDetails: { 
                        name: 'Indore Express Laundry', 
                        address: 'Vijay Nagar, Indore', 
                        city: 'Indore', 
                        pincode: '452010', 
                        gst: 'GSTIN123456' 
                    },
                    location: { lat: 22.7533, lng: 75.8937 }
                } 
            },
            { upsert: true }
        );
        console.log('✅ Vendor Registered: 9826723551 with OTP 123456');
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
})();
