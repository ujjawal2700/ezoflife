import mongoose from 'mongoose';
import MasterPricing from '../src/models/MasterPricing.js';
import MasterService from '../src/models/MasterService.js';
import Category from '../src/models/Category.js';

const MONGO_URI = 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        const records = await MasterPricing.find()
            .populate('serviceId')
            .populate('categoryId')
            .limit(10);
            
        records.forEach((r, idx) => {
            console.log(`Record ${idx + 1}:`);
            console.log(`  Service: ${r.serviceId?.itemName} (${r.serviceId?._id})`);
            console.log(`  Category ID: ${r.categoryId?._id}`);
            console.log(`  Main Category: ${r.categoryId?.mainCategory}`);
            console.log(`  Sub Category: ${r.categoryId?.subCategory}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
