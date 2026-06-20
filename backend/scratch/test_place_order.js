import fetch from 'node-fetch';

async function test() {
    const payload = {
        vendorId: "6a3660c2d0ce9fe5fbae015e",
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
        city: "Indore",
        pincode: "452010",
        shippingAddress: "Indore, 452010"
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
    } catch (err) {
        console.error('ERROR:', err);
    }
}

test();
