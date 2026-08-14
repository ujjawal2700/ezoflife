import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import Service from '../src/models/Service.js';

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find all services in the database
        const allServicesCount = await Service.countDocuments({});
        console.log(`Total services in DB: ${allServicesCount}`);

        const customServices = await Service.find({ isMaster: false }).populate('vendorId', 'displayName phone');
        console.log(`\nFound ${customServices.length} custom services in DB:`);
        customServices.forEach(s => {
            console.log(`- ID: ${s._id}`);
            console.log(`  Name: ${s.name}`);
            console.log(`  Category: ${s.category}`);
            console.log(`  SubCategory: ${s.subCategory}`);
            console.log(`  BasePrice: ${s.basePrice}`);
            console.log(`  ApprovalStatus: ${s.approvalStatus}`);
            console.log(`  Status: ${s.status}`);
            console.log(`  Vendor: ${s.vendorId ? s.vendorId.displayName : 'NULL'} (${s.vendorId ? s.vendorId._id : 'N/A'})`);
        });

        // Let's also print 5 general master services
        const masterServices = await Service.find({ isMaster: true }).limit(5);
        console.log(`\nSample of 5 master services in DB:`);
        masterServices.forEach(s => {
            console.log(`- ID: ${s._id} | Name: ${s.name} | Category: ${s.category}`);
        });


    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
