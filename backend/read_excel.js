import xlsx from 'xlsx';
const workbook = xlsx.readFile('C:\\Users\\LEONARDONEIRA\\Desktop\\excel\\Personal Transmdicas.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log('Columns:');
console.log(data[0]);
console.log('First Row:');
console.log(data[1]);
