const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join('..', 'Spinzyt_Pricing_Tables (1).xlsx');
const sheetName = 'Spinzyt_DB_Services_Master';

try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
        console.error(`Sheet "${sheetName}" not found. Available sheets: ${workbook.SheetNames.join(', ')}`);
        process.exit(1);
    }

    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(JSON.stringify(data, null, 2));
} catch (error) {
    console.error('Error reading excel:', error.message);
    process.exit(1);
}
