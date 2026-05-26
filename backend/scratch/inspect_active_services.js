import mongoose from 'mongoose';
import MasterPricing from '../src/models/MasterPricing.js';
import MasterService from '../src/models/MasterService.js';
import Category from '../src/models/Category.js';
import ServiceArea from '../src/models/ServiceArea.js';

const MONGO_URI = 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');
        
        // Find all master pricing records and check if categoryId is populated or null
        const pricings = await MasterPricing.find()
            .populate('serviceId')
            .populate('categoryId');
            
        console.log(`Found ${pricings.length} total pricing records.`);
        
        const nullCategoryCount = pricings.filter(p => !p.categoryId).length;
        console.log(`Records with null categoryId: ${nullCategoryCount}`);
        
        const uniqueCategories = [...new Set(pricings.map(p => p.categoryId?.mainCategory).filter(Boolean))];
        console.log(`Unique categories in DB:`, uniqueCategories);
        
        const uniqueSubcategories = [...new Set(pricings.map(p => p.categoryId?.subCategory).filter(Boolean))];
        console.log(`Unique subcategories in DB:`, uniqueSubcategories);
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
