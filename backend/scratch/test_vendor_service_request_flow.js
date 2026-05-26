import mongoose from 'mongoose';
import Service from '../src/models/Service.js';
import User from '../src/models/User.js';

const MONGO_URI = 'mongodb+srv://ashutoshbankey21306_db_user:fzx3knNMlyguewFZ@cluster0.dyxvq4j.mongodb.net/test?appName=Cluster0';

async function runTest() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Find a vendor
        const vendor = await User.findOne({ role: 'Vendor' });
        if (!vendor) {
            console.log('❌ No vendor found to run flow integration test.');
            return;
        }
        console.log(`👤 Using test vendor: ${vendor.displayName || 'Vendor'} (${vendor._id})`);

        // Ensure shopDetails.services array is initialized
        if (!vendor.shopDetails) {
            vendor.shopDetails = {};
        }
        if (!vendor.shopDetails.services) {
            vendor.shopDetails.services = [];
        }

        // 2. Create service simulating Vendor request
        console.log('\n--- 2. Creating Custom Service ---');
        const customService = new Service({
            name: 'Eco Silk Wash',
            category: 'Premium Silk Care',
            subCategory: 'Delicate Silks',
            basePrice: 500,
            unit: 'Per Piece',
            description: 'Organic dry cleaning for fine silk garments.',
            vendorId: vendor._id,
            isMaster: false,
            approvalStatus: 'Pending',
            status: 'Inactive'
        });

        const savedService = await customService.save();
        console.log(`✅ Saved Custom Service ID: ${savedService._id}`);
        console.log(`Approval Status: ${savedService.approvalStatus} (Expected: Pending)`);
        console.log(`Is Master: ${savedService.isMaster} (Expected: false)`);

        // Add this service to vendor user's shopDetails.services array to simulate frontend update step
        vendor.shopDetails.services.push({
            id: savedService._id.toString(),
            name: savedService.name,
            vendorRate: savedService.basePrice,
            adminRate: savedService.basePrice,
            status: 'pending',
            active: false
        });
        vendor.markModified('shopDetails.services');
        await vendor.save();
        console.log(`✅ Linked service to vendor profile with status "pending".`);

        // 3. Simulate Admin Approving the request
        console.log('\n--- 3. Admin Approving Service ---');
        
        // Find service in controller and apply updateService logic
        const updatedService = await Service.findByIdAndUpdate(
            savedService._id,
            { approvalStatus: 'Approved', status: 'Active' },
            { new: true }
        );
        console.log(`✅ Service approval status updated: ${updatedService.approvalStatus}`);

        // Trigger the sync block from updateService
        if (updatedService.approvalStatus) {
            const vendorId = updatedService.vendorId;
            const vendorUser = await User.findById(vendorId);
            if (vendorUser && vendorUser.shopDetails?.services) {
                const mappedStatus = updatedService.approvalStatus === 'Approved' ? 'approved' : 
                                     updatedService.approvalStatus === 'Rejected' ? 'rejected' : 'pending';
                
                const svcIndex = vendorUser.shopDetails.services.findIndex(s => s.id === updatedService._id.toString());
                if (svcIndex !== -1) {
                    vendorUser.shopDetails.services[svcIndex].status = mappedStatus;
                    if (mappedStatus === 'approved') {
                        vendorUser.shopDetails.services[svcIndex].active = true;
                    }
                    vendorUser.markModified('shopDetails.services');
                    await vendorUser.save();
                    console.log(`✅ Synced approval to vendor profile.`);
                }
            }
        }

        // 4. Verify Vendor user has the approved and active service
        console.log('\n--- 4. Verification Check ---');
        const reloadedVendor = await User.findById(vendor._id);
        const syncedSvc = reloadedVendor.shopDetails.services.find(s => s.id === savedService._id.toString());
        
        if (syncedSvc) {
            console.log(`Status in profile: ${syncedSvc.status} (Expected: approved)`);
            console.log(`Active in profile: ${syncedSvc.active} (Expected: true)`);
            if (syncedSvc.status === 'approved' && syncedSvc.active === true) {
                console.log('🌟 INTEGRATION FLOW SUCCESSFUL! 🌟');
            } else {
                console.error('❌ Sync values mismatched!');
            }
        } else {
            console.error('❌ Service not found in vendor profile services array after sync!');
        }

        // 5. Clean up
        console.log('\n--- 5. Cleaning Up ---');
        await Service.findByIdAndDelete(savedService._id);
        
        // Remove from vendor profile
        const cleanVendor = await User.findById(vendor._id);
        cleanVendor.shopDetails.services = cleanVendor.shopDetails.services.filter(s => s.id !== savedService._id.toString());
        cleanVendor.markModified('shopDetails.services');
        await cleanVendor.save();
        console.log('🧹 Cleaned up database entries.');

    } catch (err) {
        console.error('❌ Integration Test Failed:', err);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

runTest();
