import mongoose from 'mongoose';
import MasterService from '../src/models/MasterService.js';
import Service from '../src/models/Service.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function migrate() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected');

        const r1 = await MasterService.updateMany(
            { serviceType: { $exists: false } }, 
            { $set: { serviceType: 'individual' } }
        );
        console.log('Updated MasterServices (missing to individual):', r1.modifiedCount);

        const r2 = await MasterService.updateMany(
            { serviceType: 'normal' }, 
            { $set: { serviceType: 'individual' } }
        );
        console.log('Updated MasterServices (normal to individual):', r2.modifiedCount);

        const r3 = await Service.updateMany(
            { serviceType: { $exists: false } }, 
            { $set: { serviceType: 'individual' } }
        );
        console.log('Updated Services (missing to individual):', r3.modifiedCount);

        const r4 = await Service.updateMany(
            { serviceType: 'normal' }, 
            { $set: { serviceType: 'individual' } }
        );
        console.log('Updated Services (normal to individual):', r4.modifiedCount);

        await mongoose.disconnect();
        console.log('👋 Done');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

migrate();
