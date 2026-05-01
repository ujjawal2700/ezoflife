import axios from 'axios';

async function testApi() {
    try {
        const res = await axios.get('http://localhost:5001/api/master-services');
        console.log('Sample Service:', res.data[0]);
        console.log('Total Services:', res.data.length);
        
        const catRes = await axios.get('http://localhost:5001/api/categories/main');
        console.log('Main Categories:', catRes.data.map(c => c.name));
    } catch (err) {
        console.error('API Test Failed:', err.message);
    }
}

testApi();
