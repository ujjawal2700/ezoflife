import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const phone = '2056565656';
        const otp = '123456';
        const otpExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry
        
        const updated = await User.findOneAndUpdate(
            { phone },
            { 
                phone, 
                role: 'Customer', 
                status: 'approved', 
                displayName: 'Customer 2056',
                customerType: 'individual',
                isProfileComplete: true,
                otp,
                otpExpiry
            },
            { upsert: true, new: true }
        );
        console.log('Successfully registered user:', updated);
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
