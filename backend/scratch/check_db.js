import mongoose from 'mongoose';
import MasterService from '../src/models/MasterService.js';

async function check() {
    await mongoose.connect('mongodb://localhost:27017/ezoflife');
    const count = await MasterService.countDocuments();
    const kgItems = await MasterService.find({ itemName: /per kg/i });
    console.log('Total Count:', count);
    console.log('KG Items Found:', kgItems.length);
    if (kgItems.length > 0) {
        console.log('Sample KG Item Unit:', kgItems[0].unit);
    }
    process.exit(0);
}
check();
