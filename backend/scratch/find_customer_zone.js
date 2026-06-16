import mongoose from 'mongoose';
import ServiceArea from '../src/models/ServiceArea.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB\n');
        
        const areas = await ServiceArea.find();
        console.log(`Total Service Areas: ${areas.length}\n`);

        areas.forEach(area => {
            console.log(`- Name: ${area.areaName}`);
            console.log(`  ID: ${area._id}`);
            console.log(`  Pincodes: ${JSON.stringify(area.pincodes)}`);
            console.log(`  isActive: ${area.isActive}`);
            console.log(`  ExcelFenceId: ${area.excelFenceId}`);
            console.log('--------------------------------------------------');
        });
        
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
