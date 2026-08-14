import dotenv from 'dotenv';
dotenv.config();
import('mongoose').then(async (mongoose) => {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Check MasterService
    const MasterService = mongoose.model('MasterService', new mongoose.Schema({}, { strict: false }));
    const cottonKurta = await MasterService.findOne({ $or: [{name: /cotton kurta/i}, {itemName: /cotton kurta/i}] });
    console.log('--- Master Service ---');
    console.log(cottonKurta ? cottonKurta.toObject() : 'Not Found');

    // 2. Check ServiceArea (Geofence)
    const ServiceArea = mongoose.model('ServiceArea', new mongoose.Schema({}, { strict: false }));
    const areas = await ServiceArea.find({});
    console.log('\n--- Service Areas ---');
    areas.forEach(a => {
        const obj = a.toObject();
        console.log(`Area: ${obj.areaName}, Base Mult: ${obj.basePriceMultiplier}, Heritage Mult: ${obj.heritageMultiplier}, Expr Mult: ${obj.expressMultiplier}, Default Mult: ${obj.multiplier}`);
    });

    // 3. Check MasterPricing
    if (cottonKurta) {
        const MasterPricing = mongoose.model('MasterPricing', new mongoose.Schema({}, { strict: false }));
        const pricings = await MasterPricing.find({ serviceId: cottonKurta._id });
        console.log('\n--- Master Pricing ---');
        pricings.forEach(p => {
            const obj = p.toObject();
            console.log(`Zone: ${obj.zoneName}`);
            console.log(`  BasePrice: ${obj.basePrice}`);
            console.log(`  ZoneMult: ${obj.zoneMultiplier}`);
            console.log(`  CalculatedBasePrice: ${obj.calculatedBasePrice}`);
            console.log(`  FinalEssential: ${obj.finalPriceEssential}`);
            console.log(`  HeritageMult: ${obj.heritageMultiplier}`);
            console.log(`  FinalHeritage: ${obj.finalPriceHeritage}`);
            console.log(`  Calculations => Essential: ${obj.basePrice} * ${obj.zoneMultiplier} = ${obj.calculatedBasePrice} -> ${obj.finalPriceEssential}`);
            console.log(`  Calculations => Heritage: ${obj.finalPriceEssential} * ${obj.heritageMultiplier} = ${obj.finalPriceHeritage}`);
        });
    }
    
    mongoose.disconnect();
}).catch(console.error);
