import mongoose from 'mongoose';
import User from './src/models/User.js';
import dotenv from 'dotenv';
dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        const user = await User.findById('69f1d2bc2c76f5ab4ec82162');
        console.log('--- Supplier Info ---');
        console.log('ID:', user._id);
        console.log('Status:', user.status);
        console.log('Role:', user.role);
        console.log('Pincode (root):', user.pincode);
        console.log('City (root):', user.city);
        console.log('Supplier Details:', JSON.stringify(user.supplierDetails, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};
check();
