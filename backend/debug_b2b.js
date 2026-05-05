import mongoose from 'mongoose';
import User from './src/models/User.js';
import B2BOrder from './src/models/B2BOrder.js';
import dotenv from 'dotenv';
dotenv.config();

const debug = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        console.log('✅ Connected to DB');

        const users = await User.find({ role: 'Supplier' });
        console.log('Suppliers found:', users.length);
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Name: ${u.displayName}, Pincode: ${u.supplierDetails?.pincode}, City: ${u.supplierDetails?.city}`);
        });

        const orders = await B2BOrder.find({ status: 'Open' });
        console.log('Open B2B Orders:', orders.length);
        orders.forEach(o => {
            console.log(`- ID: ${o.b2bOrderId}, Pincode: ${o.pincode}, City: ${o.city}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

debug();
