import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import User from '../src/models/User.js';

async function checkVendors() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const users = await User.find({
            $or: [
                { role: 'Vendor' },
                { status: 'pending' },
                { onboardingStage: { $exists: true } }
            ]
        });
        console.log("\nFound users matching vendor / onboarding:");
        for (const u of users) {
            console.log(`- ID: ${u._id}`);
            console.log(`  Name: ${u.displayName} / ${u.name}`);
            console.log(`  Phone: ${u.phone}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  Status: ${u.status}`);
            console.log(`  Onboarding Stage: ${u.onboardingStage}`);
            console.log(`  Location:`, JSON.stringify(u.location));
            console.log(`  Shop Details Location:`, JSON.stringify(u.shopDetails?.location));
            console.log(`  Business Address:`, u.businessAddress);
        }

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
    }
}

checkVendors();
