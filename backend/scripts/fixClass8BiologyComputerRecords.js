/**
 * One-time script: Fix Class 8 Biology vs Computer choice.
 *
 * In Class 8, students choose either Biology OR Computer (not both).
 * - Biology students (reg: 17-1175-VIII-05, 23-1493-VIII-10) must appear ONLY in Biology course records.
 * - All other Class 8 students must appear ONLY in Computer course records (not in Biology).
 *
 * This script:
 * 1. Finds all courses that are Biology for grade 8 and Computer for grade 8 (by subject + topic grade).
 * 2. For each Biology (grade 8) record: keep only the two biology students in the record.
 * 3. For each Computer (grade 8) record: remove the two biology students from the record.
 *
 * Run from backend folder: node scripts/fixClass8BiologyComputerRecords.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Record from '../models/Record.js';
import Course from '../models/Course.js';

dotenv.config();

const CLASS_8_BIOLOGY_REG_NUMBERS = ['17-1175-VIII-05', '23-1493-VIII-10'];

function normalizeGrade(grade) {
  if (grade == null) return null;
  const s = String(grade).trim();
  if (s === '' || s === '8' || s.toUpperCase() === 'VIII') return '8';
  return s;
}

function courseIsForGrade8(course) {
  const topics = course.topics || [];
  return topics.some((t) => normalizeGrade(t.grade) === '8');
}

function isBiologyCourse(course) {
  const subj = (course.subject && String(course.subject).trim()).toLowerCase();
  return subj === 'biology';
}

function isComputerCourse(course) {
  const subj = (course.subject && String(course.subject).trim()).toLowerCase();
  return subj === 'computer';
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Run from backend folder with .env containing MONGO_URI.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const courses = await Course.find({}).lean();
  const biologyGrade8Codes = courses
    .filter((c) => courseIsForGrade8(c) && isBiologyCourse(c))
    .map((c) => c.code);
  const computerGrade8Codes = courses
    .filter((c) => courseIsForGrade8(c) && isComputerCourse(c))
    .map((c) => c.code);

  console.log('Class 8 Biology course codes:', biologyGrade8Codes);
  console.log('Class 8 Computer course codes:', computerGrade8Codes);

  const records = await Record.find({}).lean();

  let biologyUpdated = 0;
  let computerUpdated = 0;

  for (const rec of records) {
    const code = rec.courseCode;
    const students = rec.students || [];

    if (biologyGrade8Codes.includes(code)) {
      const kept = students.filter((s) =>
        CLASS_8_BIOLOGY_REG_NUMBERS.includes(String(s.registrationNumber).trim())
      );
      if (kept.length !== students.length) {
        await Record.updateOne(
          { courseCode: code },
          { $set: { students: kept } }
        );
        biologyUpdated += 1;
        console.log(`Biology record ${code}: kept ${kept.length} students (only biology choice).`);
      }
    } else if (computerGrade8Codes.includes(code)) {
      const kept = students.filter(
        (s) => !CLASS_8_BIOLOGY_REG_NUMBERS.includes(String(s.registrationNumber).trim())
      );
      if (kept.length !== students.length) {
        await Record.updateOne(
          { courseCode: code },
          { $set: { students: kept } }
        );
        computerUpdated += 1;
        console.log(`Computer record ${code}: removed biology-choice students. Before: ${students.length}, after: ${kept.length}.`);
      }
    }
  }

  console.log(`Done. Biology records updated: ${biologyUpdated}. Computer records updated: ${computerUpdated}.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
