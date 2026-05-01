import XLSX from 'xlsx';

const filePath = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';
const workbook = XLSX.readFile(filePath);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(name => {
    const ws = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws);
    console.log(`\n--- Sheet: ${name} ---`);
    console.log('Total Rows:', data.length);
    if (data.length > 0) {
        console.log('Headers:', Object.keys(data[0]));
        console.log('Sample Row:', JSON.stringify(data[0], null, 2));
    }
});
