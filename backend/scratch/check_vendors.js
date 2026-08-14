import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';

const MONGO_URI = process.env.MONGODB_URI;

async function check() {
    await mongoose.connect(MONGO_URI);
    const vendors = await User.find({ role: 'Vendor' }).lean();
    console.log('Total Vendors in DB:', vendors.length);
    
    // Find some orders to see if they are associated with any vendors
    const orders = await Order.find({}).limit(5).lean();
    console.log('Sample orders:', orders.map(o => ({
        id: o._id,
        vendor: o.vendor,
        status: o.status,
        priceBreakdown: o.priceBreakdown
    })));
    await mongoose.disconnect();
}
check();
