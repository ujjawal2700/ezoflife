import mongoose from 'mongoose';
import dotenv from 'dotenv';
import MasterService from '../src/models/MasterService.js';
import MasterPricing from '../src/models/MasterPricing.js';
import ServiceArea from '../src/models/ServiceArea.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const pricings = await MasterPricing.find().lean();
        console.log('\n--- MASTER PRICING (ALL FIELDS) ---');
        console.log(JSON.stringify(pricings, null, 2));

    } catch (err) {
        console.error('Error running debug script:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
