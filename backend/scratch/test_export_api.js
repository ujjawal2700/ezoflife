import axios from 'axios';

async function testExportApi() {
    try {
        console.log('Testing /api/orders/all without pagination limit using Axios...');
        
        // 1. Fetch all
        let res = await axios.get('http://localhost:5001/api/orders/all');
        console.log('Total orders unfiltered:', res.data.length);
        
        // 2. Fetch with zone filter
        res = await axios.get('http://localhost:5001/api/orders/all?zone=mushakhedi zone');
        console.log('Total orders filtered by zone (mushakhedi zone):', res.data.length);
        if (res.data.length > 0) {
            const allMatch = res.data.every(o => o.serviceZone === 'mushakhedi zone');
            console.log('Are all returned orders matching the zone?', allMatch);
        }

        // 3. Fetch with status filter
        res = await axios.get('http://localhost:5001/api/orders/all?status=DELIVERED');
        console.log('Total orders filtered by status (DELIVERED):', res.data.length);
        if (res.data.length > 0) {
            const allMatch = res.data.every(o => o.status === 'DELIVERED');
            console.log('Are all returned orders matching the status?', allMatch);
        }
        
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testExportApi();
