import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ phone: '9234343434' });
    console.log('VENDOR USER:', user);
    await mongoose.disconnect();
}

run();
