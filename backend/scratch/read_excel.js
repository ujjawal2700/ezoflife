import XLSX from 'xlsx';

const filePath = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total Rows:', data.length);
if (data.length > 0) {
    console.log('Headers:', Object.keys(data[0]));
    console.log('First 2 Rows:', JSON.stringify(data.slice(0, 2), null, 2));
} else {
    console.log('No data found in sheet');
}
