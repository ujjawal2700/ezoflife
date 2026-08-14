import dotenv from 'dotenv';
dotenv.config();
import('mongoose').then(async (mongoose) => {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const ServiceArea = mongoose.model('ServiceArea', new mongoose.Schema({}, { strict: false }));
    const areas = await ServiceArea.find({});
    areas.forEach(a => {
        const obj = a.toObject();
        console.log(`Area: ${obj.areaName}, Base Mult: ${obj.basePriceMultiplier}, Express Mult: ${obj.dynamicSurgeMultiplier}`);
    });
    
    mongoose.disconnect();
}).catch(console.error);
