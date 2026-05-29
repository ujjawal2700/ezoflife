import mongoose from 'mongoose';
import ServiceArea from '../src/models/ServiceArea.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife';

async function main() {
    await mongoose.connect(MONGODB_URI);
    const areas = await ServiceArea.find().lean();
    console.log('Areas Count:', areas.length);
    if (areas.length > 0) {
        console.log('First 5 areas sample:');
        areas.slice(0, 5).forEach(a => {
            console.log({
                _id: a._id,
                areaName: a.areaName,
                city: a.city,
                pincodes: a.pincodes,
                excelFenceId: a.excelFenceId
            });
        });
    } else {
        console.log('No ServiceAreas found in database.');
    }
    process.exit(0);
}
main();
