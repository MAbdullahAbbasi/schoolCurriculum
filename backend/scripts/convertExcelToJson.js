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

// Convert to JSON with raw data
const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
  header: 1,
  defval: null,
  raw: false
});

console.log(`Read ${jsonData.length} rows from Excel file\n`);

// Helper function to extract grade number from various formats
function extractGradeNumber(text) {
  if (!text) return null;
  
  const textLower = text.toLowerCase().trim();
  
  // Pattern 1: "Grade 1", "Grade 2", etc.
  let match = textLower.match(/grade\s*(\d+)/);
  if (match) return parseInt(match[1]);
  
  // Pattern 2: "Fifth grade math", "Sixth grade math", etc.
  const wordToNumber = {
    'first': 1, 'second': 2, 'third': 3, 'fourth': 4, 'fifth': 5,
    'sixth': 6, 'seventh': 7, 'eighth': 8, 'ninth': 9, 'tenth': 10,
    'eleventh': 11, 'twelfth': 12, 'thirteenth': 13
  };
  
  for (const [word, num] of Object.entries(wordToNumber)) {
    if (textLower.includes(word) && textLower.includes('grade')) {
      return num;
    }
  }
  
  return null;
}

// Parse the Excel structure
const result = [];
let currentGrade = null;
let currentId = 1;
let gradeMap = {};

let i = 0;
while (i < jsonData.length) {
  const row = jsonData[i];
  if (!row || row.length === 0) {
    i++;
    continue;
  }

  const firstCell = String(row[0] || '').trim();
  
  // Check for grade header (various formats)
  const gradeNum = extractGradeNumber(firstCell);
  
  if (gradeNum !== null) {
    // Save previous grade
    if (currentGrade !== null) {
      const gradeKey = `${currentId}-${currentGrade}`;
      if (!gradeMap[gradeKey]) {
        gradeMap[gradeKey] = {
          id: currentId,
          grade: currentGrade,
          objectives: []
        };
      }
    }
    
    // Start new grade
    currentGrade = gradeNum;
    currentId = gradeNum;
    i++;
    
    // Skip empty rows after grade header
    while (i < jsonData.length) {
      const nextRow = jsonData[i];
      if (nextRow && nextRow.length > 0 && nextRow.some(cell => cell !== null && String(cell).trim() !== '')) {
        break; // Found non-empty row
      }
      i++;
    }
    
    // Next row should be topic row (codes + titles)
    if (i < jsonData.length) {
      const topicRow = jsonData[i];
      const topics = [];
      
      // Extract topics from this row
      for (let col = 0; col < topicRow.length; col++) {
        const cell = String(topicRow[col] || '').trim();
        if (!cell || cell.length < 3) continue;
        
        // Pattern: "A.Counting to 100" or "AA.Place value"
        const topicMatch = cell.match(/^([A-Z]+)\.(.+)$/i);
        if (topicMatch) {
          topics.push({
            code: topicMatch[1].toUpperCase(),
            title: topicMatch[2].trim(),
            columnIndex: col
          });
        }
      }
      
      // If no topics found in this row, try next row
      if (topics.length === 0) {
        i++;
        if (i < jsonData.length) {
          const nextTopicRow = jsonData[i];
          for (let col = 0; col < nextTopicRow.length; col++) {
            const cell = String(nextTopicRow[col] || '').trim();
            if (!cell || cell.length < 3) continue;
            
            const topicMatch = cell.match(/^([A-Z]+)\.(.+)$/i);
            if (topicMatch) {
              topics.push({
                code: topicMatch[1].toUpperCase(),
                title: topicMatch[2].trim(),
                columnIndex: col
              });
            }
          }
        }
      }
      
      // Now process subsequent rows (alternating numbers and descriptions)
      i++;
      let currentLevel = null;
      
      while (i < jsonData.length) {
        const currentRow = jsonData[i];
        if (!currentRow || currentRow.length === 0) {
          i++;
          continue;
        }
        
        const firstCellCurrent = String(currentRow[0] || '').trim();
        
        // Check if this is a new grade header
        const newGradeNum = extractGradeNumber(firstCellCurrent);
        if (newGradeNum !== null) {
          break; // Exit to process new grade
        }
        
        // Check if first cell is a number (objective level)
        const numMatch = firstCellCurrent.match(/^(\d+)$/);
        if (numMatch) {
          currentLevel = parseInt(numMatch[1]);
          i++;
          continue;
        }
        
        // This should be a description row
        // Process each topic column and create objectives
        if (currentLevel !== null && topics.length > 0) {
          const gradeKey = `${currentId}-${currentGrade}`;
          if (!gradeMap[gradeKey]) {
            gradeMap[gradeKey] = {
              id: currentId,
              grade: currentGrade,
              objectives: []
            };
          }
          
          for (const topic of topics) {
            const colIdx = topic.columnIndex;
            if (colIdx < currentRow.length) {
              const descCell = String(currentRow[colIdx] || '').trim();
              
              // Skip if empty or just a bullet
              if (!descCell || descCell === '•' || descCell.length < 5) continue;
              
              // Create objective with level-specific code
              let objectiveCode = topic.code;
              if (currentLevel > 1) {
                objectiveCode = `${topic.code}.${currentLevel}`;
              }
              
              let objectiveTitle = topic.title;
              
              // Create the objective
              gradeMap[gradeKey].objectives.push({
                code: objectiveCode,
                title: objectiveTitle,
                description: descCell
              });
            }
          }
        }
        
        i++;
      }
      
      continue; // Process next grade
    }
  }
  
  i++;
}

// Save last grade
if (currentGrade !== null) {
  const gradeKey = `${currentId}-${currentGrade}`;
  if (!gradeMap[gradeKey]) {
    gradeMap[gradeKey] = {
      id: currentId,
      grade: currentGrade,
      objectives: []
    };
  }
}

// Convert to array and sort
const finalResult = Object.values(gradeMap).sort((a, b) => {
  if (a.grade !== b.grade) {
    return a.grade - b.grade;
  }
  return a.id - b.id;
});

console.log(`✅ Processed ${finalResult.length} grade documents\n`);
console.log('Grade distribution:');
const gradeCounts = {};
finalResult.forEach(item => {
  gradeCounts[item.grade] = (gradeCounts[item.grade] || 0) + 1;
});
Object.keys(gradeCounts).sort().forEach(grade => {
  const items = finalResult.filter(r => r.grade === parseInt(grade));
  const totalObjectives = items.reduce((sum, item) => sum + item.objectives.length, 0);
  console.log(`  Grade ${grade}: ${gradeCounts[grade]} document(s) with ${totalObjectives} total objectives`);
});

// Write to JSON file
const outputPath = path.join(__dirname, '../data/objectives.json');
fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), 'utf8');

console.log(`\n✅ Successfully converted Excel to JSON!`);
console.log(`📁 Output file: ${outputPath}`);
console.log(`📊 Total documents: ${finalResult.length}`);
console.log(`📝 Total objectives: ${finalResult.reduce((sum, item) => sum + item.objectives.length, 0)}`);

// Show sample from each grade
if (finalResult.length > 0) {
  console.log(`\n📋 Sample from each grade:`);
  finalResult.forEach(grade => {
    if (grade.objectives.length > 0) {
      console.log(`\nGrade ${grade.grade} (${grade.objectives.length} objectives):`);
      console.log(JSON.stringify({
        code: grade.objectives[0].code,
        title: grade.objectives[0].title,
        description: grade.objectives[0].description
      }, null, 2));
    }
  });
}
