import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import ServiceArea from './src/models/ServiceArea.js';
import Category from './src/models/Category.js';
import MasterService from './src/models/MasterService.js';
import Service from './src/models/Service.js';

async function check() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.");

        const serviceAreas = await ServiceArea.find();
        console.log("\n--- SERVICE AREAS ---");
        console.log("Total Count:", serviceAreas.length);
        serviceAreas.forEach(sa => {
            console.log(`- [${sa.isActive ? 'ACTIVE' : 'INACTIVE'}] ${sa.areaName} (${sa.city}) multiplier: ${sa.multiplier}, boundary type: ${sa.boundary?.type}`);
            if (sa.boundary && sa.boundary.coordinates) {
                console.log(`  Coordinates:`, JSON.stringify(sa.boundary.coordinates));
            }
        });

        const categories = await Category.find();
        console.log("\n--- CATEGORIES ---");
        console.log("Total Count:", categories.length);
        categories.forEach(c => {
            console.log(`- [${c.isActive ? 'ACTIVE' : 'INACTIVE'}] ID: ${c._id}, Main: ${c.mainCategory}, Sub: ${c.subCategory}`);
        });

        const masterServices = await MasterService.find();
        console.log("\n--- MASTER SERVICES ---");
        console.log("Total Count:", masterServices.length);
        masterServices.forEach(ms => {
            console.log(`- [${ms.isActive ? 'ACTIVE' : 'INACTIVE'}] ID: ${ms._id}, Name: ${ms.name || ms.itemName}, curr_ind: ${ms.curr_ind}, serviceType: ${ms.serviceType}, categoryId: ${ms.categoryId}`);
        });

        const services = await Service.find().populate('categoryId');
        console.log("\n--- SERVICES (CUSTOM VENDOR) ---");
        console.log("Total Count:", services.length);
        services.forEach(s => {
            console.log(`- [${s.status === 'Active' || s.isActive ? 'ACTIVE' : 'INACTIVE'}] ID: ${s._id}, Name: ${s.name || s.itemName}, approvalStatus: ${s.approvalStatus}, serviceType: ${s.serviceType}, categoryId: ${s.categoryId?._id}`);
        });

    } catch (err) {
        console.error("Error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected.");
    }
}

check();
