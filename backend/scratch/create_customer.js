import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const phoneNumbers = ['1100997766'];
        const role = 'Customer';
        const otp = '123456';
        const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year from now
        
        for (const phone of phoneNumbers) {
            const updatedUser = await User.findOneAndUpdate(
                { phone },
                { 
                    phone,
                    role,
                    otp,
                    otpExpiry: expiry,
                    displayName: `Customer ${phone}`,
                    status: 'approved',
                    customerType: 'individual',
                    isProfileComplete: true
                },
                { upsert: true, new: true }
            );
            
            console.log(`User ${phone} created/updated successfully:`, updatedUser);
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
