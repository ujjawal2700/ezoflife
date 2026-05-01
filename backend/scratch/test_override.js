import axios from 'axios';

async function test() {
    try {
        const res = await axios.post('http://localhost:5001/api/area-overrides', {
            serviceId: '69f337562c76f5ab4ec84c80',
            areaId: '69eafd0d2c76f5ab4ec7cf1e',
            customPrice: 500
        });
        console.log('Response:', res.data);
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}
test();
