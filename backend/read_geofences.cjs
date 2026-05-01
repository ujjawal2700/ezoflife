
const XLSX = require('xlsx');
const workbook = XLSX.readFile('../Spinzyt_Pricing_Tables (1).xlsx');
const sheet = workbook.Sheets['Service_Geofences'];
const data = XLSX.utils.sheet_to_json(sheet);
console.log(JSON.stringify(data.slice(0, 5), null, 2));
