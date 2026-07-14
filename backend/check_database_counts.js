import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

(async () => {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        const Category = mongoose.connection.collection('categories');
        const MasterService = mongoose.connection.collection('masterservices');
        
        const catCount = await Category.countDocuments({});
        const serviceCount = await MasterService.countDocuments({});
        
        console.log(`Categories count: ${catCount}`);
        console.log(`MasterServices count: ${serviceCount}`);
        
        if (catCount > 0) {
            const sampleCats = await Category.find({}).limit(5).toArray();
            console.log('Sample Categories:', sampleCats);
        }
        if (serviceCount > 0) {
            const sampleServices = await MasterService.find({}).limit(5).toArray();
            console.log('Sample Master Services:', sampleServices);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
})();
