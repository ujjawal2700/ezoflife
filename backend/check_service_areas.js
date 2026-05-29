import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ServiceArea from './src/models/ServiceArea.js';

async function run() {
    try {
        const uri = process.env.MONGODB_URI;
        await mongoose.connect(uri);
        console.log('✅ Connected');

        const areas = await ServiceArea.find({});
        console.log(`Total Service Areas: ${areas.length}`);
        areas.forEach(a => {
            console.log(JSON.stringify({
                id: a._id,
                areaName: a.areaName,
                city: a.city,
                isActive: a.isActive,
                pincodes: a.pincodes,
                boundaryType: a.boundary?.type,
                coordinatesCount: a.boundary?.coordinates?.[0]?.length
            }, null, 2));
        });
    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
}
run();
