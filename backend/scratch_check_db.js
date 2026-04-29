import mongoose from 'mongoose';
import SupplierApplication from './src/models/SupplierApplication.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const count = await SupplierApplication.countDocuments();
        const apps = await SupplierApplication.find().lean();
        console.log('Count:', count);
        console.log('Applications:', JSON.stringify(apps, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
