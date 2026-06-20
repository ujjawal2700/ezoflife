import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    const User = (await import('../src/models/User.js')).default;
    const vendor = await User.findById('6a3660c2d0ce9fe5fbae015e');
    console.log('VENDOR DETAILS:', JSON.stringify(vendor, null, 2));
    await mongoose.disconnect();
}
run();
