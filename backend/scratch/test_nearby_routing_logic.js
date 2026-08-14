import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { getNearbyVendors } from '../src/controllers/orderController.js';

const MONGO_URI = process.env.MONGODB_URI;

async function test() {
    await mongoose.connect(MONGO_URI);
    
    const testLat = 22.7196; // Indore lat
    const testLng = 75.8577; // Indore lng
    const radius = 50000; // Large radius to get all vendors for verification
    
    console.log('--- Testing URD Customer (Individual) ---');
    const allVendors = await getNearbyVendors(testLat, testLng, radius, [], false);
    console.log(`URD customer found ${allVendors.length} vendors in range.`);
    
    console.log('\n--- Testing RD Customer (Business/Retail) ---');
    const rdVendorsOnly = await getNearbyVendors(testLat, testLng, radius, [], true);
    console.log(`RD customer found ${rdVendorsOnly.length} vendors in range.`);
    
    console.log('\nList of vendors seen by RD Customer:');
    for (const v of rdVendorsOnly) {
        console.log(`  Name: ${v.name}, ID: ${v.id}`);
    }
    
    await mongoose.disconnect();
}
test();
