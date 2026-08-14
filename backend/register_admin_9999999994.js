import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './src/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function registerAdmin() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const phone = '9999999994';
        const otp = '123456';
        const otpExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year expiry

        const adminData = {
            phone,
            role: 'Admin',
            status: 'approved',
            displayName: 'Master Admin',
            isProfileComplete: true,
            otp,
            otpExpiry,
            adminAccessType: 'Read/Write'
        };

        const updatedUser = await User.findOneAndUpdate(
            { phone },
            { $set: adminData },
            { upsert: true, new: true }
        );

        console.log('✅ Admin registered/updated successfully:');
        console.log({
            id: updatedUser._id,
            phone: updatedUser.phone,
            role: updatedUser.role,
            status: updatedUser.status,
            otp: updatedUser.otp,
            otpExpiry: updatedUser.otpExpiry
        });

        await mongoose.disconnect();
        console.log('Disconnected from DB');
    } catch (err) {
        console.error('❌ Error registering admin:', err);
        process.exit(1);
    }
}

registerAdmin();
