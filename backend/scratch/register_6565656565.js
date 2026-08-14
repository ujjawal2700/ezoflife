import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const phone = '6565656565';
        const updated = await User.findOneAndUpdate(
            { phone },
            { 
                phone, 
                role: 'Customer', 
                status: 'approved', 
                displayName: 'Test Customer 6565',
                customerType: 'individual',
                isProfileComplete: true
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
