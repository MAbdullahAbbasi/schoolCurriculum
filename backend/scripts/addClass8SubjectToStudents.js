/**
 * One-time migration: Add Subject field to existing Class 8 students.
 *
 * - Students with registration numbers 17-1175-VIII-05 and 23-1493-VIII-10 → Subject = "Biology"
 * - All other Class 8 students → Subject = "Computer"
 *
 * Run from backend folder: node scripts/addClass8SubjectToStudents.js
 * Requires MONGO_URI in .env.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import StudentData from '../models/StudentData.js';

dotenv.config();

const CLASS_8_BIOLOGY_REG_NUMBERS = ['17-1175-VIII-05', '23-1493-VIII-10'];

function isGradeEight(grade) {
  if (grade == null) return false;
  const g = String(grade).trim();
  return g === '8' || g.toUpperCase() === 'VIII';
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set. Run from backend folder with .env containing MONGO_URI.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const grade8Only = await StudentData.find({
    $or: [{ grade: '8' }, { grade: /^viii$/i }],
  }).lean();

  if (grade8Only.length === 0) {
    console.log('No Class 8 students found. Nothing to update.');
    process.exit(0);
  }

  let biologyCount = 0;
  let computerCount = 0;

  for (const student of grade8Only) {
    const regNum = String(student.registrationNumber).trim();
    const subject = CLASS_8_BIOLOGY_REG_NUMBERS.includes(regNum) ? 'Biology' : 'Computer';
    await StudentData.updateOne(
      { registrationNumber: regNum },
      { $set: { subject } }
    );
    if (subject === 'Biology') biologyCount += 1;
    else computerCount += 1;
  }

  console.log(`Updated ${grade8Only.length} Class 8 student(s): ${biologyCount} Biology, ${computerCount} Computer.`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
