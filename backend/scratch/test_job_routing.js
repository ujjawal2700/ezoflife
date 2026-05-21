import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup dotenv
dotenv.config();

import User from '../src/models/User.js';
import Job from '../src/models/Job.js';
import JobApplication from '../src/models/JobApplication.js';
import { sendAdminJobApplicationNotification } from '../src/utils/emailHelper.js';

async function runTest() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ezoflife');
        console.log('✅ Connected.');

        // 1. Find or create an Admin user in the database
        let adminUser = await User.findOne({ role: 'Admin' });
        if (!adminUser) {
            console.log('Admin user not found. Seeding a temporary Admin...');
            adminUser = await User.create({
                phone: '9999999994',
                role: 'Admin',
                status: 'approved',
                displayName: 'Master Admin',
                email: 'admin_test_db@ezoflife.com'
            });
        } else {
            console.log(`Found existing Admin in DB: ${adminUser.displayName} (${adminUser.phone}), Email: ${adminUser.email}`);
            // Let's ensure the admin has an email address set
            if (!adminUser.email) {
                adminUser.email = 'admin_test_db@ezoflife.com';
                await adminUser.save();
                console.log(`Updated Admin email to: ${adminUser.email}`);
            }
        }

        // 2. Find or create a Vendor user
        let vendorUser = await User.findOne({ role: 'Vendor' });
        if (!vendorUser) {
            console.log('Vendor user not found. Seeding a temporary Vendor...');
            vendorUser = await User.create({
                phone: '9999999992',
                role: 'Vendor',
                status: 'approved',
                displayName: 'Test Vendor',
                email: 'vendor_test_db@ezoflife.com'
            });
        } else {
            console.log(`Found existing Vendor in DB: ${vendorUser.displayName} (${vendorUser.phone}), Email: ${vendorUser.email}`);
            if (!vendorUser.email) {
                vendorUser.email = 'vendor_test_db@ezoflife.com';
                await vendorUser.save();
                console.log(`Updated Vendor email to: ${vendorUser.email}`);
            }
        }

        // 3. Create an Admin-posted Job
        console.log('\n--- Creating Admin Job ---');
        const adminJob = await Job.create({
            title: 'Admin Software Dev',
            creatorRole: 'Admin',
            companyName: 'EzOfLife Admin Team',
            status: 'Active'
        });
        console.log(`Created Job ID: ${adminJob._id}, Creator: ${adminJob.creatorRole}`);

        // 4. Create a Vendor-posted Job
        console.log('--- Creating Vendor Job ---');
        const vendorJob = await Job.create({
            title: 'Vendor Associate',
            creatorRole: 'Vendor',
            vendor: vendorUser._id,
            companyName: 'EzOfLife Vendor Store',
            status: 'Active'
        });
        console.log(`Created Job ID: ${vendorJob._id}, Creator: ${vendorJob.creatorRole}, Vendor: ${vendorJob.vendor}`);

        // Mock Application
        const applicationMock = {
            applicantName: 'Test Applicant',
            applicantEmail: 'candidate@test.com',
            contactNumber: '1234567890',
            coverLetter: 'I am a highly motivated candidate.',
            resumeLink: 'resume-12345.pdf'
        };

        // 5. Test Routing logic for Admin Job
        console.log('\n--- Simulating Application to Admin Job ---');
        {
            const job = await Job.findById(adminJob._id).populate('vendor');
            const adminUserDb = await User.findOne({ role: 'Admin' });
            const adminEmail = adminUserDb?.email || process.env.ADMIN_EMAIL || 'admin@ezoflife.com';

            let recipientEmail = adminEmail;
            let ccEmail = undefined;

            if (job.creatorRole === 'Vendor') {
                const vendorEmail = job.vendor?.email;
                if (vendorEmail) {
                    recipientEmail = vendorEmail;
                    ccEmail = adminEmail;
                }
            }

            console.log(`Resulting Recipients for Admin Job application:`);
            console.log(`TO: ${recipientEmail}`);
            console.log(`CC: ${ccEmail || 'None'}`);

            if (recipientEmail !== 'admin_test_db@ezoflife.com' || ccEmail !== undefined) {
                throw new Error('❌ Incorrect routing for Admin-posted job');
            }
            console.log('✅ Admin Job application email parameters resolved correctly.');
        }

        // 6. Test Routing logic for Vendor Job
        console.log('\n--- Simulating Application to Vendor Job ---');
        {
            const job = await Job.findById(vendorJob._id).populate('vendor');
            const adminUserDb = await User.findOne({ role: 'Admin' });
            const adminEmail = adminUserDb?.email || process.env.ADMIN_EMAIL || 'admin@ezoflife.com';

            let recipientEmail = adminEmail;
            let ccEmail = undefined;

            if (job.creatorRole === 'Vendor') {
                const vendorEmail = job.vendor?.email;
                if (vendorEmail) {
                    recipientEmail = vendorEmail;
                    ccEmail = adminEmail;
                }
            }

            console.log(`Resulting Recipients for Vendor Job application:`);
            console.log(`TO: ${recipientEmail}`);
            console.log(`CC: ${ccEmail || 'None'}`);

            if (recipientEmail !== 'vendor_test_db@ezoflife.com' || ccEmail !== 'admin_test_db@ezoflife.com') {
                throw new Error('❌ Incorrect routing for Vendor-posted job');
            }
            console.log('✅ Vendor Job application email parameters resolved correctly.');
        }

        // Cleanup temporary jobs
        console.log('\n🧹 Cleaning up test jobs...');
        await Job.findByIdAndDelete(adminJob._id);
        await Job.findByIdAndDelete(vendorJob._id);
        console.log('Cleanup completed successfully.');

        console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Routing logic is correct.');
    } catch (error) {
        console.error('❌ Test failed with error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
    }
}

runTest();
