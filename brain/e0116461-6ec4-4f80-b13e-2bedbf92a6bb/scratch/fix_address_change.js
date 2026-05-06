const fs = require('fs');
const path = 'd:/ezoflife/frontend/src/modules/user/pages/HomePage.jsx';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// 1. Update Change buttons in Slot Picker to use setShowAddressPicker(true)
const newLines = lines.map(line => {
    if (line.includes('setShowSlotPicker(false); setShowAddressModal(true);')) {
        return line.replace('setShowAddressModal(true);', 'setShowAddressPicker(true);');
    }
    return line;
});

fs.writeFileSync(path, newLines.join('\n'));
console.log('Address Change button now opens the full Address Picker');
