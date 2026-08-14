import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Service from '../src/models/Service.js';
import Category from '../src/models/Category.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Let's get one vendor who has services
        const vendor = await User.findOne({ phone: '8888888881' }).lean();
        if (!vendor) {
            console.log('Vendor 8888888881 not found');
            return;
        }

        console.log('Vendor shopDetails.services:');
        console.log(vendor.shopDetails?.services);

        // For each service, let's query the master service / custom service / category
        for (const s of (vendor.shopDetails?.services || [])) {
            console.log(`\nService Name: ${s.name}, ID: ${s.id}`);
            // Let's search in Service collection (custom services)
            const serviceDoc = await Service.findById(s.id).populate('categoryId').lean();
            if (serviceDoc) {
                console.log('Found in Service collection (custom):');
                console.log('Category:', serviceDoc.categoryId?.mainCategory);
                console.log('Subcategory:', serviceDoc.categoryId?.subCategory);
            } else {
                // Let's search in MasterService collection (or MasterPricing)
                // Let's see what models we have
                console.log('Checking master models...');
            }
        }

        // List some custom services
        const customCount = await Service.countDocuments();
        console.log(`\nTotal custom services: ${customCount}`);
        const sampleCustom = await Service.find().limit(5).populate('categoryId').lean();
        console.log('Sample custom services:', JSON.stringify(sampleCustom, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
