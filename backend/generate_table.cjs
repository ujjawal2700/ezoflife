const fs = require('fs');
let content = fs.readFileSync('excel_data_utf8.json', 'utf8');
if (content.charCodeAt(0) === 0xFEFF) {
    content = content.slice(1);
}
const data = JSON.parse(content);

let markdown = '# Full Spinzyt DB Services Master Data\n\n';
markdown += '| SKU ID | Item Name | Category ID | Avg Weight (kg) | Seasonality | TAT | Express Multiplier | GST% | Base Price | Disc. Price |\n';
markdown += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

data.forEach(row => {
    markdown += `| ${row.SKU_ID || ''} | ${row['Item Name'] || ''} | ${row.Category_ID || ''} | ${row['Avergae-Weight(kg)'] || ''} | ${row.Seasonality || ''} | ${row.Estimated_Min_TAT_Days || ''} | ${row.Express_Multiplier || ''} | ${row['GST%'] || ''} | ${row.Global_Base_Price || ''} | ${row.Global_Discounted_Price || ''} |\n`;
});

fs.writeFileSync('full_excel_report.md', markdown);
console.log('Markdown table generated with ' + data.length + ' rows.');
