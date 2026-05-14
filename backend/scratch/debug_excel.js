import XLSX from 'xlsx';

const EXCEL_PATH = 'd:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx';

try {
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheetNames = workbook.SheetNames;
    console.log('Sheets:', sheetNames);

    sheetNames.forEach(name => {
        const sheet = workbook.Sheets[name];
        const data = XLSX.utils.sheet_to_json(sheet);
        console.log(`\n--- Sheet: ${name} ---`);
        if (data.length > 0) {
            console.log('Headers:', Object.keys(data[0]));
            console.log('Sample Row 1:', data[0]);
        } else {
            console.log('Empty sheet');
        }
    });
} catch (error) {
    console.error('Error:', error);
}
