import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const vendors = await User.find({ role: 'Vendor' });
  console.log(`Found ${vendors.length} vendors`);

  for(let v of vendors) {
      console.log('---');
      console.log('Vendor Phone:', v.phone);
      console.log('Vendor Status:', v.status);
      console.log('Vendor Location:', v.location);
      if(v.shopDetails) {
          console.log('Vendor Services:');
          (v.shopDetails.services || []).forEach(s => {
              console.log(` - ID: ${s.id || s._id}, Name: ${s.name}, Active: ${s.active}, Status: ${s.status}`);
          });
      }
  }

  process.exit(0);
}).catch(console.error);
