/**
 * Seed one ready-to-use login for every role.
 *
 * Each account is created "past the gates" so it lands on its dashboard rather
 * than an onboarding or approval screen:
 *   - status: 'approved'        (vendors otherwise sit on /vendor/approval-pending)
 *   - isProfileComplete: true   (customers otherwise bounce to /user/profile/create)
 *   - otp: '123456' with a long expiry, matching the dev OTP
 *
 * Idempotent: upserts by phone, so re-running refreshes the OTP rather than
 * creating duplicates.
 *
 *   node scripts/seedRoleUsers.js
 *   node scripts/seedRoleUsers.js --dry-run
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DRY_RUN = process.argv.includes('--dry-run');
const OTP = '123456';
const OTP_EXPIRY = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

const base = (phone, role, displayName) => ({
    phone,
    role,
    displayName,
    status: 'approved',
    isProfileComplete: true,
    otp: OTP,
    otpExpiry: OTP_EXPIRY
});

const ACCOUNTS = [
    {
        ...base('9999999994', 'Admin', 'Master Admin'),
        // Matches the hardcoded bypass in authController.requestOtp.
        adminAccessType: 'Read/Write'
    },
    {
        ...base('9876500001', 'Customer', 'Demo Customer'),
        customerType: 'individual',
        address: '12 Test Street, Indore, Madhya Pradesh 452001',
        walletBalance: 0,
        location: { lat: 22.7196, lng: 75.8577 },
        addresses: [{
            type: 'Home',
            address: '12 Test Street, Indore, Madhya Pradesh 452001',
            location: { lat: 22.7196, lng: 75.8577 },
            isDefault: true
        }]
    },
    {
        ...base('9876500002', 'Vendor', 'Demo Laundry'),
        location: { lat: 22.7196, lng: 75.8577 },
        shopDetails: {
            name: 'Demo Laundry Services',
            address: '45 Vendor Road, Indore, Madhya Pradesh 452001',
            pincode: '452001',
            city: 'Indore',
            gst: '23ABCDE1234F1Z5',
            services: []
        }
    },
    {
        ...base('9876500003', 'Supplier', 'Demo Supplier'),
        location: { lat: 22.7196, lng: 75.8577 },
        supplierDetails: {
            businessName: 'Demo Supplies Pvt Ltd',
            address: '78 Supplier Lane, Indore, Madhya Pradesh 452001',
            city: 'Indore',
            pincode: '452001',
            gst: '23FGHIJ5678K1Z2',
            supplyCategories: [],
            entityType: 'Private Limited',
            designation: 'Director'
        }
    }
];

const run = async () => {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set — check backend/.env');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    const dbName = mongoose.connection.name;
    console.log(`Connected to database: ${dbName}`);
    if (DRY_RUN) console.log('DRY RUN — nothing will be written.\n');

    const results = [];
    for (const acc of ACCOUNTS) {
        const existing = await User.findOne({ phone: acc.phone }).lean();

        if (DRY_RUN) {
            results.push({ ...acc, _action: existing ? 'would update' : 'would create' });
            continue;
        }

        const saved = await User.findOneAndUpdate(
            { phone: acc.phone },
            { $set: acc },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        results.push({ ...acc, _action: existing ? 'updated' : 'created', _id: saved._id });
    }

    console.log('\nROLE        PHONE         OTP      STATUS');
    console.log('─────────────────────────────────────────────────────');
    for (const r of results) {
        console.log(
            `${r.role.padEnd(11)} ${r.phone.padEnd(13)} ${OTP.padEnd(8)} ${r._action}`
        );
    }

    const counts = await User.aggregate([
        { $group: { _id: '$role', n: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]);
    console.log('\nAccounts now in the database:');
    for (const c of counts) console.log(`  ${String(c.n).padStart(4)}  ${c._id}`);

    await mongoose.disconnect();
};

run().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
