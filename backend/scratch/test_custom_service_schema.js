import mongoose from 'mongoose';
import Service from '../src/models/Service.js';

const MONGO_URI = 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Try creating a service with a custom category and subCategory
        const testService = new Service({
            name: 'Ultimate Wool Care',
            category: 'Winter Wear Special', // Normally invalid enum
            subCategory: 'Heavy Sweaters',  // New field
            basePrice: 450,
            unit: 'Per Piece',
            description: 'Special organic wash for heavy cashmere sweaters.',
            isMaster: false,
            approvalStatus: 'Pending',
            status: 'Inactive'
        });

        const saved = await testService.save();
        console.log('✅ Saved Service successfully:', saved._id);
        console.log('Saved Category:', saved.category);
        console.log('Saved SubCategory:', saved.subCategory);

        if (saved.category !== 'Winter Wear Special' || saved.subCategory !== 'Heavy Sweaters') {
            throw new Error('Fields were not saved correctly!');
        }

        // Clean up
        await Service.findByIdAndDelete(saved._id);
        console.log('🧹 Cleaned up test service.');

        console.log('🌟 DATABASE SCHEMA TEST PASSED! 🌟');
    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
