
const XLSX = require('xlsx');
const workbook = XLSX.readFile('../Spinzyt_Pricing_Tables (1).xlsx');
workbook.SheetNames.forEach(name => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet);
    if (data.length > 0) {
        console.log(`Sheet: ${name} | Columns:`, Object.keys(data[0]));
    }
});
