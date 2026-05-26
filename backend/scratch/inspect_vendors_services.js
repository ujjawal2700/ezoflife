import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Service from '../src/models/Service.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const vendors = await User.find({ role: { $regex: /^vendor$/i } }).lean();
        console.log(`Found ${vendors.length} vendors in DB:`);
        
        for (const vendor of vendors) {
            console.log(`\n==================================================`);
            console.log(`Vendor Name: ${vendor.displayName || vendor.name}`);
            console.log(`ID: ${vendor._id}`);
            console.log(`Phone: ${vendor.phone}`);
            console.log(`Status: ${vendor.status}`);
            console.log(`Approved Services in User.shopDetails.services:`);
            const shopServices = vendor.shopDetails?.services || [];
            console.log(JSON.stringify(shopServices, null, 2));
            
            const customServices = await Service.find({ vendorId: vendor._id }).lean();
            console.log(`Custom Services in Service collection:`);
            console.log(JSON.stringify(customServices, null, 2));
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
