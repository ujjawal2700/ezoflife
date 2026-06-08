import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0');
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
