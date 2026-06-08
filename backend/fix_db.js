import mongoose from 'mongoose';
async function fix() {
  await mongoose.connect('mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0');
  const res = await mongoose.connection.db.collection('vendorproductqueries').updateMany(
    { productId: new mongoose.Types.ObjectId('6a196301ffb2b1fc4500beb1') },
    { $set: { productId: new mongoose.Types.ObjectId('6a1942c8803aa37a203b27ac') } }
  );
  console.log('Fixed:', res.modifiedCount);
  mongoose.disconnect();
}
fix();
