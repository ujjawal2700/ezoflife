const fs = require('fs');
const path = 'd:/ezoflife/frontend/src/modules/user/pages/HomePage.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// 1. Update Pickup Change button
const pickupChangeIndex = lines.findIndex(l => l.includes('Pickup') && l.includes('setShowAddressPicker(true)'));
if (pickupChangeIndex !== -1) {
    lines[pickupChangeIndex] = lines[pickupChangeIndex].replace(
        'onClick={() => { setShowSlotPicker(false); setShowAddressPicker(true); }}',
        'onClick={() => { setActiveAddressType(\'pickup\'); setShowSlotPicker(false); setShowAddressForm(true); }}'
    );
}

// 2. Update Delivery Change button
const deliveryChangeIndex = lines.findIndex(l => l.includes('Delivery') && l.includes('setShowAddressPicker(true)'));
if (deliveryChangeIndex !== -1) {
    lines[deliveryChangeIndex] = lines[deliveryChangeIndex].replace(
        'onClick={() => { setShowSlotPicker(false); setShowAddressPicker(true); }}',
        'onClick={() => { setActiveAddressType(\'delivery\'); setShowSlotPicker(false); setShowAddressForm(true); }}'
    );
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Address Change button updated to open manual Address Form directly');
