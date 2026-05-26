import axios from 'axios';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'ezoflife_secret_key_2026';
const VENDOR_ID = '6a0da510d806c3c3bba35820'; // ID of the vendor from the log file

async function run() {
    try {
        // 1. Generate a mock vendor token
        const token = jwt.sign(
            { id: VENDOR_ID, role: 'Vendor', phone: '9999999992' },
            JWT_SECRET,
            { expiresIn: '7d' }
        );
        console.log('✅ Generated vendor token:', token.substring(0, 30) + '...');

        // 2. Perform POST /api/services request
        console.log('\n📡 Performing POST /api/services...');
        const res = await axios.post('http://localhost:5001/api/services', {
            name: 'Eco Silk Wash V2',
            category: 'Delicate Care',
            subCategory: 'Silk garments',
            basePrice: 650,
            unit: 'Per Piece',
            description: 'Gentle organic wash for fine silk dresses.',
            vendorId: VENDOR_ID,
            status: 'Inactive',
            approvalStatus: 'Pending',
            isMaster: false
        }, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('✅ Success!');
        console.log('Status Code:', res.status);
        console.log('Response Body:', JSON.stringify(res.data, null, 2));

    } catch (err) {
        console.error('❌ Request Failed!');
        if (err.response) {
            console.error('Status Code:', err.response.status);
            console.error('Response Headers:', err.response.headers);
            console.error('Response Body:', err.response.data);
        } else {
            console.error('Error Message:', err.message);
        }
    }
}

run();
