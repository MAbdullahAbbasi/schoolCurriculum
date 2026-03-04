import express from 'express';
import mongoose from 'mongoose';
import Record from '../models/Record.js';
import Course from '../models/Course.js';

const router = express.Router();

// GET all records
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const records = await Record.find({}).sort({ createdAt: -1 }).limit(100);
    
    const recordsData = records.map(record => record.toObject());

    res.json({
      success: true,
      data: recordsData,
    });
  } catch (error) {
    console.error('Error fetching records:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch records',
    });
  }
});

// GET record by course code
router.get('/course/:courseCode', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { courseCode } = req.params;
    const record = await Record.findOne({ courseCode });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        message: 'Record not found',
      });
    }

    res.json({
      success: true,
      data: record.toObject(),
    });
  } catch (error) {
    console.error('Error fetching record:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch record',
    });
  }
});

// POST create or update a record
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { courseCode, courseName, students } = req.body;

    // Validate required fields
    if (!courseCode || !courseCode.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Course code required',
        message: 'Course code is required',
      });
    }

    if (!courseName || !courseName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Course name required',
        message: 'Course name is required',
      });
    }

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Students required',
        message: 'At least one student is required',
      });
    }

    // Load course to compute objective marks from question marks if needed
    const course = await Course.findOne({ code: courseCode.trim() }).lean();
    const topics = (course?.topics || []);
    const courseQuestions = (course?.questions || []);
    const totalMarksCourse = topics.reduce((s, t) => s + (Number(t.marks) || 0), 0);

    function computeObjectiveMarksFromSlots(student) {
      const questionMarks = student.questionMarks || {};
      const notAttemptedSlots = student.notAttemptedSlots || [];
      const leftOnChoiceSlots = student.leftOnChoiceSlots || [];
      const objMarks = {};
      topics.forEach((_, idx) => { objMarks[String(idx)] = 0; });

      for (let q = 1; q <= (courseQuestions.length || 0); q++) {
        const slotKey = `q${q}`;
        const qObj = courseQuestions.find(qu => Number(qu.questionIndex) === q);
        if (!qObj || !(qObj.topicIndices && qObj.topicIndices.length)) continue;
        const indices = qObj.topicIndices.map(i => Number(i));
        const slotMax = indices.reduce((s, i) => s + (Number(topics[i]?.marks) || 0), 0);
        if (notAttemptedSlots.includes(slotKey)) {
          indices.forEach(i => { objMarks[String(i)] = 0; });
          continue;
        }
        if (leftOnChoiceSlots.includes(slotKey)) {
          indices.forEach(i => { objMarks[String(i)] = 0; });
          continue;
        }
        const obtained = Number(questionMarks[slotKey]);
        if (Number.isNaN(obtained) || obtained < 0) continue;
        if (slotMax <= 0) continue;
        const ratio = Math.min(1, obtained / slotMax);
        indices.forEach(i => {
          const maxI = Number(topics[i]?.marks) || 0;
          objMarks[String(i)] = Math.round(ratio * maxI * 100) / 100;
        });
      }

      const totalObtained = Object.values(objMarks).reduce((s, v) => s + Number(v), 0);
      const percentage = totalMarksCourse > 0 ? Math.round((totalObtained / totalMarksCourse) * 10000) / 100 : 0;
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 85) grade = 'A';
      else if (percentage >= 80) grade = 'B+';
      else if (percentage >= 75) grade = 'B';
      else if (percentage >= 70) grade = 'C+';
      else if (percentage >= 65) grade = 'C';
      else if (percentage >= 60) grade = 'D+';
      else if (percentage >= 55) grade = 'D';
      else if (percentage >= 50) grade = 'E';

      return { objectiveMarks: objMarks, overallPercentage: percentage, overallGrade: grade };
    }

    // Validate students data and compute objectiveMarks if questionMarks provided
    const studentsPayload = students.map(student => {
      if (!student.registrationNumber || !student.studentName) {
        throw new Error('Student registration number and name required');
      }
      let objectiveMarks = student.objectiveMarks || {};
      let overallPercentage = student.overallPercentage;
      let overallGrade = student.overallGrade || '';

      if (course && courseQuestions.length > 0 && (student.questionMarks != null || student.notAttemptedSlots != null || student.leftOnChoiceSlots != null)) {
        const computed = computeObjectiveMarksFromSlots(student);
        objectiveMarks = computed.objectiveMarks;
        overallPercentage = computed.overallPercentage;
        overallGrade = computed.overallGrade;
      } else {
        if (typeof overallPercentage !== 'number' || overallPercentage < 0 || overallPercentage > 100) {
          throw new Error('Overall percentage must be between 0 and 100');
        }
        if (!overallGrade || !overallGrade.trim()) {
          throw new Error('Overall grade is required');
        }
      }

      return {
        registrationNumber: student.registrationNumber.trim(),
        studentName: student.studentName.trim(),
        weightageScores: student.weightageScores || {},
        objectiveMarks,
        questionMarks: student.questionMarks || {},
        notAttemptedSlots: Array.isArray(student.notAttemptedSlots) ? student.notAttemptedSlots : [],
        leftOnChoiceSlots: Array.isArray(student.leftOnChoiceSlots) ? student.leftOnChoiceSlots : [],
        overallPercentage,
        overallGrade: String(overallGrade).trim(),
      };
    });

    // Check if record exists for this course
    const existingRecord = await Record.findOne({ courseCode });

    const recordData = {
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      students: studentsPayload,
    };

    let record;
    if (existingRecord) {
      // Update existing record
      record = await Record.findOneAndUpdate(
        { courseCode },
        recordData,
        { new: true, runValidators: true }
      );
    } else {
      // Create new record
      record = new Record(recordData);
      await record.save();
    }

    res.status(existingRecord ? 200 : 201).json({
      success: true,
      message: existingRecord ? 'Record updated successfully' : 'Record created successfully',
      data: {
        courseCode: record.courseCode,
        courseName: record.courseName,
        studentsCount: record.students.length,
      },
    });
  } catch (error) {
    console.error('Error saving record:', error);
    
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstError.message || 'Invalid record data',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to save record',
    });
  }
});

export default router;
