import mongoose from 'mongoose';
import User from '../src/models/User.js';
import SupplierApplication from '../src/models/SupplierApplication.js';

async function run() {
  try {
    const mongoUri = 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find users with phone matching 5555555555
    const users = await User.find({ phone: { $regex: '5555555555' } });
    console.log(`Found ${users.length} users:`);
    for (const u of users) {
      console.log(`User ID: ${u._id}`);
      console.log(`Phone: ${u.phone}`);
      console.log(`Role: ${u.role}`);
      console.log(`Display Name: ${u.displayName}`);
      console.log(`Supplier Details:`, u.supplierDetails);
      
      // Let's find any SupplierApplication for this user
      const apps = await SupplierApplication.find({ user: u._id });
      console.log(`Found ${apps.length} Supplier Applications for this user:`);
      for (const app of apps) {
        console.log(`- App ID: ${app._id}`);
        console.log(`  Registered Business Name: ${app.registeredBusinessName}`);
        console.log(`  Status: ${app.status}`);
        console.log(`  Onboarding Stage: ${app.onboardingStage}`);
        console.log(`  Delivery Frequency:`, app.deliveryFrequency);
      }
    }
  } catch (error) {
    console.error('Error querying:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run();
