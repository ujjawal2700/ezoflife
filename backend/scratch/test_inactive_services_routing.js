import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import Order from '../src/models/Order.js';
import { getNearbyVendors } from '../src/controllers/orderController.js';

const MONGO_URI = process.env.MONGODB_URI;

async function test() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Find an approved vendor
        const vendor = await User.findOne({ role: 'Vendor', status: 'approved' });
        if (!vendor) {
            console.error('❌ No approved vendor found to test.');
            return;
        }
        console.log(`👤 Testing with Vendor: ${vendor.displayName || vendor.phone} (ID: ${vendor._id})`);

        // Ensure they have services in shopDetails
        if (!vendor.shopDetails?.services || vendor.shopDetails.services.length === 0) {
            console.log('⚠️ Vendor has no services. Mocking a service for testing...');
            vendor.shopDetails = vendor.shopDetails || {};
            vendor.shopDetails.services = [{
                id: 'dummy_service_id_1234567890',
                name: 'Test Laundry',
                active: true,
                status: 'approved'
            }];
            vendor.location = { lat: 22.7196, lng: 75.8577 }; // Indore center
            await vendor.save();
        }

        const testService = vendor.shopDetails.services[0];
        const serviceId = testService.id || testService._id?.toString();
        const vendorLat = vendor.location?.lat || 22.7196;
        const vendorLng = vendor.location?.lng || 75.8577;

        console.log(`🔍 Service under test: ID=${serviceId}, Name=${testService.name}`);

        // --- TEST 1: Service is ACTIVE ---
        console.log('--- TEST 1: Setting service to ACTIVE ---');
        vendor.shopDetails.services[0].active = true;
        vendor.shopDetails.services[0].status = 'approved';
        vendor.markModified('shopDetails.services');
        await vendor.save();

        let nearby = await getNearbyVendors(vendorLat, vendorLng, 5, [serviceId]);
        let isMatched = nearby.some(v => v.id.toString() === vendor._id.toString());
        console.log(`Result: Vendor in nearby list? ${isMatched ? '✅ YES' : '❌ NO'}`);
        if (!isMatched) {
            throw new Error('Test 1 Failed: Active service should have matched vendor.');
        }

        // --- TEST 2: Service is INACTIVE ---
        console.log('--- TEST 2: Setting service to INACTIVE ---');
        vendor.shopDetails.services[0].active = false;
        vendor.markModified('shopDetails.services');
        await vendor.save();

        nearby = await getNearbyVendors(vendorLat, vendorLng, 5, [serviceId]);
        isMatched = nearby.some(v => v.id.toString() === vendor._id.toString());
        console.log(`Result: Vendor in nearby list? ${isMatched ? '❌ YES (Error!)' : '✅ NO'}`);
        if (isMatched) {
            throw new Error('Test 2 Failed: Inactive service should have filtered out vendor.');
        }

        // --- TEST 3: Service is PENDING approval ---
        console.log('--- TEST 3: Setting service status to PENDING ---');
        vendor.shopDetails.services[0].active = true;
        vendor.shopDetails.services[0].status = 'pending';
        vendor.markModified('shopDetails.services');
        await vendor.save();

        nearby = await getNearbyVendors(vendorLat, vendorLng, 5, [serviceId]);
        isMatched = nearby.some(v => v.id.toString() === vendor._id.toString());
        console.log(`Result: Vendor in nearby list? ${isMatched ? '❌ YES (Error!)' : '✅ NO'}`);
        if (isMatched) {
            throw new Error('Test 3 Failed: Pending service should have filtered out vendor.');
        }

        // Clean up and restore vendor service
        vendor.shopDetails.services[0].active = true;
        vendor.shopDetails.services[0].status = 'approved';
        vendor.markModified('shopDetails.services');
        await vendor.save();
        console.log('🧹 Cleaned up and restored vendor service to active approved.');

        console.log('\n🌟 ALL TESTS PASSED SUCCESSFULLY! 🌟');
    } catch (err) {
        console.error('❌ Test Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

test();
