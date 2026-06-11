import('mongoose').then(async (mongoose) => {
    await mongoose.connect('mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0');
    
    const ServiceArea = mongoose.model('ServiceArea', new mongoose.Schema({}, { strict: false }));
    const areas = await ServiceArea.find({});
    areas.forEach(a => {
        const obj = a.toObject();
        console.log(`Area: ${obj.areaName}, Base Mult: ${obj.basePriceMultiplier}, Express Mult: ${obj.dynamicSurgeMultiplier}`);
    });
    
    mongoose.disconnect();
}).catch(console.error);
