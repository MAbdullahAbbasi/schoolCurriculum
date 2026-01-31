import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Excel file
const excelFilePath = path.join(__dirname, '../data/Objectives.xlsx');
const workbook = XLSX.readFile(excelFilePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Get raw data
const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
  header: 1,
  defval: null
});

console.log(`Total rows: ${jsonData.length}\n`);

// Analyze first 50 rows to understand structure
console.log('=== First 50 rows analysis ===\n');
for (let i = 0; i < Math.min(50, jsonData.length); i++) {
  const row = jsonData[i];
  if (!row || row.length === 0) continue;
  
  const nonEmptyCells = row.filter(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
  if (nonEmptyCells.length === 0) continue;
  
  console.log(`Row ${i + 1}: [${nonEmptyCells.map(c => String(c).substring(0, 30)).join(' | ')}]`);
}

// Try to find patterns
console.log('\n=== Looking for Grade headers ===\n');
for (let i = 0; i < Math.min(100, jsonData.length); i++) {
  const row = jsonData[i];
  if (!row || row.length === 0) continue;
  
  const firstCell = String(row[0] || '').trim();
  if (firstCell.match(/grade\s*\d+/i) || firstCell.match(/^\d+$/) && parseInt(firstCell) <= 13) {
    console.log(`Row ${i + 1}: ${firstCell} - Full row:`, row.slice(0, 5).map(c => String(c || '').substring(0, 20)));
  }
}
