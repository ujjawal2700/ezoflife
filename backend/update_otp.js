import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

async function updateOtp() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const phone = '7823232323';
        
        const user = await User.findOneAndUpdate(
            { phone, role: 'Customer' },
            { 
                otp: '123456', 
                otpExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) 
            },
            { new: true }
        );
        
        console.log('User OTP updated successfully:', user.phone, user.otp);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

updateOtp();
