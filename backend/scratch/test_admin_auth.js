async function runTests() {
    console.log('Testing Admin Protection Endpoints on Port 5002...');

    // 1. Test public endpoint: GET /api/admin/config
    try {
        const resConfig = await fetch('http://localhost:5002/api/admin/config');
        console.log(`GET /api/admin/config - Status: ${resConfig.status}`);
        if (resConfig.ok) {
            const data = await resConfig.json();
            console.log(`GET /api/admin/config - Success! Config keys:`, Object.keys(data));
        } else {
            console.log(`GET /api/admin/config - Failed! Body:`, await resConfig.text());
        }
    } catch (e) {
        console.error('GET /api/admin/config - Error:', e.message);
    }

    // 2. Test protected endpoint: GET /api/admin-test-direct (should be 401)
    try {
        const resDirect = await fetch('http://localhost:5002/api/admin-test-direct');
        console.log(`GET /api/admin-test-direct - Status: ${resDirect.status} (Expected: 401/403)`);
        const text = await resDirect.text();
        console.log(`GET /api/admin-test-direct - Body:`, text);
    } catch (e) {
        console.error('GET /api/admin-test-direct - Error:', e.message);
    }

    // 3. Test protected endpoint: POST /api/categories (should be 401)
    try {
        const resPostCat = await fetch('http://localhost:5002/api/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Test Category' })
        });
        console.log(`POST /api/categories - Status: ${resPostCat.status} (Expected: 401/403)`);
        const text = await resPostCat.text();
        console.log(`POST /api/categories - Body:`, text);
    } catch (e) {
        console.error('POST /api/categories - Error:', e.message);
    }

    // 4. Test protected endpoint: GET /api/supplier/requests (should be 401)
    try {
        const resSupplierReq = await fetch('http://localhost:5002/api/supplier/requests');
        console.log(`GET /api/supplier/requests - Status: ${resSupplierReq.status} (Expected: 401/403)`);
        const text = await resSupplierReq.text();
        console.log(`GET /api/supplier/requests - Body:`, text);
    } catch (e) {
        console.error('GET /api/supplier/requests - Error:', e.message);
    }
}

runTests();
