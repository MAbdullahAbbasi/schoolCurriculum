import express from 'express';
import mongoose from 'mongoose';
import Course from '../models/Course.js';

const router = express.Router();

// Generate unique course code
const generateCourseCode = async () => {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    // Generate code: CRS-YYYYMMDD-HHMMSS-XXXX (where XXXX is random)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    code = `CRS-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
    
    // Check if code already exists
    const existing = await Course.findOne({ code });
    if (!existing) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique course code');
  }

  return code;
};

// POST create a new course
router.post('/', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { courseName, courseDuration, weightage, startingDate, topics } = req.body;

    // Validate required fields
    if (!courseName || !courseName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Course name required',
        message: 'Course name is required',
      });
    }

    if (!courseDuration || !courseDuration.type || !courseDuration.value) {
      return res.status(400).json({
        success: false,
        error: 'Duration invalid',
        message: 'Course duration is required',
      });
    }

    if (!weightage || !Array.isArray(weightage) || weightage.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Weightage required',
        message: 'At least one weightage item is required',
      });
    }

    // Validate weightage items
    const totalWeightage = weightage.reduce((sum, item) => {
      const percentage = Number(item.percentage) || 0;
      return sum + percentage;
    }, 0);

    if (Math.abs(totalWeightage - 100) > 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Weightage invalid',
        message: 'Weightage must total 100%',
      });
    }

    if (!startingDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date required',
        message: 'Starting date is required',
      });
    }

    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Topics required',
        message: 'At least one topic is required',
      });
    }

    // Generate unique course code
    const code = await generateCourseCode();

    // Create course object
    const courseData = {
      code,
      courseName: courseName.trim(),
      courseDuration: {
        type: courseDuration.type,
        value: Number(courseDuration.value),
      },
      weightage: weightage.map(item => ({
        label: item.label.trim(),
        percentage: Number(item.percentage),
      })),
      startingDate: new Date(startingDate),
      topics: topics.map(topic => ({
        courseCode: topic.courseCode ? String(topic.courseCode).trim() : '',
        topicName: topic.topicName ? String(topic.topicName).trim() : '',
      })),
    };

    // Save to database
    const course = new Course(courseData);
    await course.save();

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        code: course.code,
        courseName: course.courseName,
      },
    });
  } catch (error) {
    console.error('Error creating course:', error);
    
    // Handle duplicate code error (shouldn't happen, but just in case)
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        error: 'Duplicate course code',
        message: 'Course code already exists',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0];
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: firstError.message || 'Invalid course data',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to create course',
    });
  }
});

// GET all courses
router.get('/', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const courses = await Course.find({}).sort({ createdAt: -1 }).limit(100);
    
    const coursesData = courses.map(course => {
      const courseObj = course.toObject();
      // Format dates
      if (courseObj.startingDate) {
        courseObj.startingDate = new Date(courseObj.startingDate).toISOString().split('T')[0];
      }
      return courseObj;
    });

    res.json({
      success: true,
      data: coursesData,
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch courses',
    });
  }
});

export default router;
