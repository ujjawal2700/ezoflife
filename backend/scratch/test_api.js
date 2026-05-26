import http from 'http';

http.get('http://localhost:5001/api/master-pricing?limit=2', (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('API Response keys:', Object.keys(json));
            console.log('Full API Response:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw output:', data);
        }
    });
}).on('error', (err) => {
    console.error('API Error:', err.message);
});
