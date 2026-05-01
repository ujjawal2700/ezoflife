
const XLSX = require('xlsx');
const workbook = XLSX.readFile('../Spinzyt_Pricing_Tables (1).xlsx');
const sheet = workbook.Sheets['Spinzyt_DB_Services_Master'];
const data = XLSX.utils.sheet_to_json(sheet);
if (data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
} else {
    console.log('No data found');
}
