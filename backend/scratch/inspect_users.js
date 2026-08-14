import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const users = await User.find().limit(20).lean();
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`ID: ${u._id}, Phone: ${u.phone}, Role: ${u.role}, Status: ${u.status}, Name: ${u.displayName || u.name}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
