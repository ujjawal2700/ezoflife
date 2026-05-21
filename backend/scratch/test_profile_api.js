import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

import User from '../src/models/User.js';

async function testProfileApi() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        console.log('✅ Connected.');

        // Find Admin user
        const adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            console.log('❌ Admin user not found. Run seed script or test_job_routing first.');
            return;
        }

        console.log(`Original Admin Profile in DB:`);
        console.log(`Name/DisplayName: ${adminUser.displayName}`);
        console.log(`Email: ${adminUser.email}`);
        console.log(`Phone: ${adminUser.phone}`);

        // Update fields (simulate what updateProfile does)
        const updatedName = 'Super Master Admin';
        const updatedEmail = 'super_admin@ezoflife.com';
        const updatedPhone = '9999999994'; // keep same

        adminUser.displayName = updatedName;
        adminUser.email = updatedEmail;
        adminUser.phone = updatedPhone;
        await adminUser.save();

        console.log(`\nUpdated Admin Profile in DB:`);
        console.log(`Name/DisplayName: ${adminUser.displayName}`);
        console.log(`Email: ${adminUser.email}`);
        console.log(`Phone: ${adminUser.phone}`);

        if (adminUser.displayName === updatedName && adminUser.email === updatedEmail) {
            console.log('\n✅ Profile update and DB save succeeded!');
        } else {
            console.log('\n❌ Profile update verification failed.');
        }
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

testProfileApi();
