import mongoose from 'mongoose';
import User from '../src/models/User.js';
import ServiceArea from '../src/models/ServiceArea.js';
import MasterService from '../src/models/MasterService.js';
import Category from '../src/models/Category.js';
import Notification from '../src/models/Notification.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find the test vendor
        const vendor = await User.findOne({ phone: '9999999992', role: 'Vendor' });
        if (!vendor) {
            console.error('Test vendor 9999999992 not found!');
            return;
        }
        console.log('Found Vendor location:', vendor.location);

        // Ensure vendor location is set (Nashik coordinates fallback if 0)
        if (!vendor.location || (vendor.location.lat === 0 && vendor.location.lng === 0)) {
            vendor.location = { lat: 20.005, lng: 73.763 };
            await vendor.save();
            console.log('Set vendor location to Nashik:', vendor.location);
        }

        // 2. Find or create a ServiceArea polygon covering the vendor's location
        const lat = vendor.location.lat;
        const lng = vendor.location.lng;
        let area = await ServiceArea.findOne({ areaName: 'Test Area Nashik' });
        if (!area) {
            // Draw a polygon around Nashik vendor coordinates
            area = new ServiceArea({
                areaName: 'Test Area Nashik',
                city: 'Nashik',
                multiplier: 1.0,
                isActive: true,
                boundary: {
                    type: 'Polygon',
                    coordinates: [[
                        [lng - 0.05, lat - 0.05],
                        [lng + 0.05, lat - 0.05],
                        [lng + 0.05, lat + 0.05],
                        [lng - 0.05, lat + 0.05],
                        [lng - 0.05, lat - 0.05]
                    ]]
                }
            });
            await area.save();
            console.log('Created Test Area Nashik');
        }

        // 3. Find or create a Category
        let category = await Category.findOne();
        if (!category) {
            category = new Category({
                mainCategory: 'Dry Cleaning',
                subCategory: 'Gents Wear',
                description: 'Dry cleaning services'
            });
            await category.save();
            console.log('Created Category');
        }

        // Clear existing test master services with same name to avoid duplicates
        const testName = 'Premium Silk Coat Test ' + Math.floor(Math.random() * 10000);
        
        // 4. Create a new master service (which will auto-sync)
        console.log(`Creating Master Service: ${testName}...`);
        
        // Let's call the controller function or perform the controller creation steps directly
        const { createMasterService } = await import('../src/controllers/masterServiceController.js');
        
        // We can simulate req and res
        const req = {
            body: {
                itemName: testName,
                categoryId: category._id,
                basePrice: 500,
                discountedPrice: 450,
                unit: 'per_item',
                description: 'Test description',
                isActive: true
            }
        };
        const res = {
            status: (code) => ({
                json: (data) => {
                    console.log(`Res Status: ${code}, Data ID:`, data._id || data);
                }
            })
        };

        await createMasterService(req, res);

        // Wait a brief moment for async notification flows
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 5. Verify vendor's services
        const updatedVendor = await User.findOne({ phone: '9999999992' });
        const hasService = updatedVendor.shopDetails?.services?.some(s => s.name === testName);
        console.log(`Is service in vendor's shopDetails.services?`, hasService);

        // 6. Verify Notifications
        const notif = await Notification.findOne({ recipient: vendor._id }).sort({ createdAt: -1 });
        if (notif) {
            console.log('Latest Notification saved in DB:', notif.title, '-', notif.message);
        } else {
            console.log('No notification found in DB!');
        }

        // Cleanup
        await ServiceArea.deleteOne({ _id: area._id });
        await MasterService.deleteOne({ itemName: testName });
        console.log('Test complete and cleaned up successfully.');
    } catch (err) {
        console.error('Test error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

run();
