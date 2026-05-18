import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ServiceArea from '../src/models/ServiceArea.js';
import PincodeMapping from '../src/models/PincodeMapping.js';

dotenv.config();

async function clearGeofenceData() {
    try {
        console.log('🚀 Connecting to Database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected.');

        console.log('🧹 Clearing Service Areas (Geofences)...');
        const deletedAreas = await ServiceArea.deleteMany({});
        console.log(`✅ Deleted ${deletedAreas.deletedCount} Service Area documents.`);

        console.log('🧹 Clearing Pincode Mappings...');
        const deletedMappings = await PincodeMapping.deleteMany({});
        console.log(`✅ Deleted ${deletedMappings.deletedCount} Pincode Mapping documents.`);

        console.log('\n✨ All Geofence and Pincode Mapping data successfully removed from database!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error clearing geofence data:', error);
        process.exit(1);
    }
}

clearGeofenceData();
