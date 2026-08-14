import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await mongoose.connection.db.collection('vendorproductqueries').updateMany(
    { productId: new mongoose.Types.ObjectId('6a196301ffb2b1fc4500beb1') },
    { $set: { productId: new mongoose.Types.ObjectId('6a1942c8803aa37a203b27ac') } }
  );
  console.log('Fixed:', res.modifiedCount);
  mongoose.disconnect();
}
fix();
