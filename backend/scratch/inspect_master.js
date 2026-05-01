import XLSX from 'xlsx';

const filePath = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';
const workbook = XLSX.readFile(filePath);
const name = "Master_Service_List";
const ws = workbook.Sheets[name];
if (!ws) {
    console.log("Sheet not found:", name);
    process.exit(1);
}
const data = XLSX.utils.sheet_to_json(ws);
console.log(`\n--- Sheet: ${name} ---`);
console.log('Total Rows:', data.length);
if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('Sample Rows:', JSON.stringify(data.slice(0, 3), null, 2));
}
