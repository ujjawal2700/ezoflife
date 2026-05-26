import mongoose from 'mongoose';
import Category from '../src/models/Category.js'; // Registers Category schema
import MasterService from '../src/models/MasterService.js';
import MasterPricing from '../src/models/MasterPricing.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const mServices = await MasterService.find().limit(5).populate('categoryId').lean();
        console.log('Sample MasterServices:');
        console.log(JSON.stringify(mServices, null, 2));

        const mPricing = await MasterPricing.find().limit(5).populate('serviceId').populate('categoryId').lean();
        console.log('Sample MasterPricing:');
        console.log(JSON.stringify(mPricing, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
