import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const phone = '9999999994';
        const updated = await User.findOneAndUpdate(
            { phone },
            { 
                phone, 
                role: 'Admin', 
                status: 'approved', 
                displayName: 'Admin User',
                isProfileComplete: true,
                otp: '123456',
                otpExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year expiry
            },
            { upsert: true, new: true }
        );
        console.log('Successfully registered/updated admin user:', updated);
    } catch (err) {
        console.error('Error running script:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
