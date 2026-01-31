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

    // Validate students data
    for (const student of students) {
      if (!student.registrationNumber || !student.studentName) {
        return res.status(400).json({
          success: false,
          error: 'Student data invalid',
          message: 'Student registration number and name required',
        });
      }
      if (typeof student.overallPercentage !== 'number' || student.overallPercentage < 0 || student.overallPercentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'Invalid percentage',
          message: 'Overall percentage must be between 0 and 100',
        });
      }
      if (!student.overallGrade || !student.overallGrade.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Grade required',
          message: 'Overall grade is required',
        });
      }
    }

    // Check if record exists for this course
    const existingRecord = await Record.findOne({ courseCode });

    const recordData = {
      courseCode: courseCode.trim(),
      courseName: courseName.trim(),
      students: students.map(student => ({
        registrationNumber: student.registrationNumber.trim(),
        studentName: student.studentName.trim(),
        weightageScores: student.weightageScores || {},
        overallPercentage: student.overallPercentage,
        overallGrade: student.overallGrade.trim(),
      })),
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
