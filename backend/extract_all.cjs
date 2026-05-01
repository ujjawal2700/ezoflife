const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = '../Spinzyt_Pricing_Tables (1).xlsx';
const workbook = XLSX.readFile(filePath);

const sheetsToExtract = [
    'Spinzyt_DB_Categories',
    'Spinzyt_DB_Services_Master',
    'Service_Geofences',
    'Geofence_Pincode_Mapping'
];

let finalReport = '# Full Spinzyt Pricing Tables Report\n\n';

sheetsToExtract.forEach(sheetName => {
    const sheet = workbook.Sheets[sheetName];
    if (sheet) {
        const data = XLSX.utils.sheet_to_json(sheet);
        finalReport += `## Sheet: ${sheetName} (${data.length} rows)\n\n`;
        
        if (data.length > 0) {
            const headers = Object.keys(data[0]);
            finalReport += '| ' + headers.join(' | ') + ' |\n';
            finalReport += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
            
            data.forEach(row => {
                finalReport += '| ' + headers.map(h => row[h] !== undefined ? row[h] : '').join(' | ') + ' |\n';
            });
        }
        finalReport += '\n---\n\n';
    } else {
        finalReport += `## Sheet: ${sheetName} (NOT FOUND)\n\n`;
    }
});

fs.writeFileSync('all_tables_report.md', finalReport);
console.log('All tables extracted successfully.');
