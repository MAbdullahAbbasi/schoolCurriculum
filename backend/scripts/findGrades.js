import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelFilePath = path.join(__dirname, '../data/Objectives.xlsx');
const workbook = XLSX.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
  header: 1,
  defval: null,
  raw: false
});

console.log('Searching for grade headers...\n');
const grades = [];

for (let i = 0; i < jsonData.length; i++) {
  const row = jsonData[i];
  if (!row || row.length === 0) continue;
  
  const firstCell = String(row[0] || '').trim();
  const gradeMatch = firstCell.match(/grade\s*(\d+)/i);
  
  if (gradeMatch) {
    grades.push({
      row: i + 1,
      grade: parseInt(gradeMatch[1]),
      nextRow: i < jsonData.length - 1 ? jsonData[i + 1]?.[0] : null
    });
  }
}

console.log(`Found ${grades.length} grade headers:\n`);
grades.forEach(g => {
  console.log(`  Row ${g.row}: Grade ${g.grade}`);
});
