import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import VendorSupplyCategory from '../src/models/VendorSupplyCategory.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function check() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const cats = await VendorSupplyCategory.find().sort({ excelCategoryId: 1 });
    console.log('\n--- All Vendor Supply Categories ---');
    cats.forEach(c => {
        console.log({
            _id: c._id,
            excelCategoryId: c.excelCategoryId,
            mainCategory: c.mainCategory,
            subCategory: c.subCategory,
            isActive: c.isActive
        });
    });
}

check().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
