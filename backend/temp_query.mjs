import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const schema = new mongoose.Schema({}, { strict: false, collection: 'vendormastersupplies' });
  const Model = mongoose.model('VMS', schema);
  
  const docs = await Model.find({ supplierId: 'SUP-6565' });
  console.log('Count:', docs.length);
  docs.forEach(d => {
      console.log(`ID: ${d._id}, Supplier: ${d.supplierId}, isTemplate: ${d.isTemplate}, freq: "${d.deliveryFrequency}"`);
  });
  process.exit(0);
}

run();
