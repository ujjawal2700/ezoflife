import mongoose from 'mongoose';
import User from '../src/models/User.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // 1. Clear pincode in user document
    await User.findByIdAndUpdate('6a3660c2d0ce9fe5fbae015e', {
        'shopDetails.pincode': ''
    });
    console.log('Cleared pincode in database for vendor.');

    // 2. Fetch user to confirm it is empty
    let user = await User.findById('6a3660c2d0ce9fe5fbae015e');
    console.log('Confirm pincode is empty:', user.shopDetails.pincode);

    // 3. Make order placement API request without passing pincode in body
    const payload = {
        vendorId: '6a3660c2d0ce9fe5fbae015e',
        items: [
            {
                materialId: "6a3664b3bfee7f7706a31527",
                name: "Detergent",
                quantity: 1,
                price: 2358.82,
                wholesaleRate: 1999,
                basePrice: 2358.82,
                supplierPlatformMultiplier: 1.0,
                supplierFacilityName: "arshu private limited",
                deliveryFrequency: "Weekly"
            }
        ],
        totalAmount: 2358.82,
        totalPlatformFee: 500.00,
        subTotal: 1999,
        deliveryCharges: 0,
        city: '',
        pincode: '', // empty!
        shippingAddress: 'Musakhedi, Indore, Madhya Pradesh 452001, India'
    };

    try {
        const res = await fetch('http://localhost:5001/api/b2b-orders/place', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log('RESPONSE STATUS:', res.status);
        console.log('RESPONSE DATA:', JSON.stringify(data, null, 2));

        // 4. Fetch user again to confirm pincode was auto-extracted and updated in DB
        user = await User.findById('6a3660c2d0ce9fe5fbae015e');
        console.log('Pincode in DB after API call:', user.shopDetails.pincode);
    } catch (err) {
        console.error('API Error:', err);
    }

    await mongoose.disconnect();
}

run();
