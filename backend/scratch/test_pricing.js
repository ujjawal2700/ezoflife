import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import MasterPricing from '../src/models/MasterPricing.js';
import MasterService from '../src/models/MasterService.js';
import Category from '../src/models/Category.js';

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const data = await MasterPricing.findOne()
            .populate('serviceId')
            .populate('categoryId');
            
        console.log('Sample MasterPricing Record:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
