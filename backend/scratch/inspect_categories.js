import XLSX from 'xlsx';

const filePath = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';
const workbook = XLSX.readFile(filePath);
const name = "Spinzyt_DB_Categories";
const ws = workbook.Sheets[name];
const data = XLSX.utils.sheet_to_json(ws);
console.log(`\n--- Sheet: ${name} ---`);
console.log('Headers:', Object.keys(data[0]));
console.log('Sample Rows:', JSON.stringify(data.slice(0, 2), null, 2));
