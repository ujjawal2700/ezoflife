import XLSX from 'xlsx';
const workbook = XLSX.readFile('d:/ezoflife/Spinzyt_Pricing_Tables (1).xlsx');
console.log(workbook.SheetNames);
