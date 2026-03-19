import express from 'express';
import mongoose from 'mongoose';
import Course from '../models/Course.js';
import Record from '../models/Record.js';
import User from '../models/User.js';
import { ROLE } from '../rbac/roles.js';
import { requireRoles } from '../rbac/guards.js';

const router = express.Router();

// Normalize topic grade: number for digit-only, string for KG (e.g. KG-1), never NaN
function normalizeTopicGrade(grade) {
  if (grade == null || grade === '') return null;
  const s = String(grade).trim();
  if (s === '') return null;
  if (/^\d+$/.test(s)) return Number(s);
  return s;
}

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
router.post('/', requireRoles([ROLE.ADMIN, ROLE.COURSE_ADMIN]), async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { courseName, courseDuration, weightage, startingDate, topics, totalMarks: bodyTotalMarks, totalQuestions: bodyTotalQuestions, questions: bodyQuestions, subject: bodySubject, compulsoryQuestions: bodyCompulsory, questionParts: bodyQuestionParts, questionPartMarks: bodyQuestionPartMarks } = req.body;

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

    const topicsWithMarks = topics.map(t => ({
      courseCode: (t.courseCode != null ? String(t.courseCode) : '').trim(),
      topicName: (t.topicName != null ? String(t.topicName) : '').trim(),
      description: (t.description != null ? String(t.description) : '').trim(),
      marks: Number(t.marks) || 0,
      grade: normalizeTopicGrade(t.grade),
    }));
    const sumMarks = topicsWithMarks.reduce((sum, t) => sum + (t.marks || 0), 0);
    const expectedTotal =
      bodyTotalMarks != null && Number.isFinite(Number(bodyTotalMarks)) && Number(bodyTotalMarks) >= 1
        ? Number(bodyTotalMarks)
        : sumMarks;
    if (expectedTotal < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid total marks',
        message: 'Total marks must be a number greater than 0, or provide objective marks that sum to at least 1.',
      });
    }
    // Do not require sum of all objective marks to equal course total: frontend validates
    // compulsory parts sum = totalMarks and that all fields are filled; optional parts
    // can make objective total exceed course total.

    let questionsToSave = [];
    const totalQuestionsNum = bodyTotalQuestions != null && Number.isFinite(Number(bodyTotalQuestions)) && Number(bodyTotalQuestions) >= 1
      ? Number(bodyTotalQuestions)
      : null;

    if (totalQuestionsNum != null) {
      if (!bodyQuestions || !Array.isArray(bodyQuestions) || bodyQuestions.length !== totalQuestionsNum) {
        return res.status(400).json({
          success: false,
          error: 'Invalid questions',
          message: `Please provide exactly ${totalQuestionsNum} question(s), each with at least one objective.`,
        });
      }
      const topicCount = topicsWithMarks.length;
      for (let i = 0; i < bodyQuestions.length; i++) {
        const q = bodyQuestions[i];
        const qIndex = q.questionIndex != null ? Number(q.questionIndex) : i + 1;
        let indices = Array.isArray(q.topicIndices) ? q.topicIndices.map(n => Number(n)).filter(n => Number.isFinite(n) && n >= 0 && n < topicCount) : [];
        indices = [...new Set(indices)];
        if (indices.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Invalid questions',
            message: `Question Q${qIndex} must have at least one objective selected.`,
          });
        }
        questionsToSave.push({ questionIndex: qIndex, topicIndices: indices });
      }
    }

    // Generate unique course code
    const code = await generateCourseCode();

    const compulsoryNum = bodyCompulsory != null && Number.isFinite(Number(bodyCompulsory)) && Number(bodyCompulsory) >= 0 ? Number(bodyCompulsory) : null;
    const questionPartsToSave = Array.isArray(bodyQuestionParts) ? bodyQuestionParts.map(p => ({
      questionIndex: Number(p.questionIndex),
      numParts: Number(p.numParts) || 0,
      compulsoryParts: Number(p.compulsoryParts) || 0,
    })) : [];
    const questionPartMarksToSave = Array.isArray(bodyQuestionPartMarks) ? bodyQuestionPartMarks.map(m => ({
      questionIndex: Number(m.questionIndex),
      partIndex: Number(m.partIndex),
      marks: Number(m.marks) || 0,
    })) : [];

    // Create course object
    const subjectStr = bodySubject != null && String(bodySubject).trim() !== '' ? String(bodySubject).trim() : '';
    const courseData = {
      code,
      courseName: courseName.trim(),
      ...(subjectStr && { subject: subjectStr }),
      courseDuration: {
        type: courseDuration.type,
        value: Number(courseDuration.value),
      },
      weightage: weightage.map(item => ({
        label: item.label.trim(),
        percentage: Number(item.percentage),
      })),
      startingDate: new Date(startingDate),
      topics: topicsWithMarks,
      ...(totalQuestionsNum != null && { totalQuestions: totalQuestionsNum }),
      ...(compulsoryNum != null && { compulsoryQuestions: compulsoryNum }),
      ...(questionPartsToSave.length > 0 && { questionParts: questionPartsToSave }),
      ...(questionPartMarksToSave.length > 0 && { questionPartMarks: questionPartMarksToSave }),
      ...(questionsToSave.length > 0 && { questions: questionsToSave }),
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

    const role = req.user?.role || ROLE.EDUCATOR;
    const username = req.user?.username;
    const query = role === ROLE.EDUCATOR && username ? { educatorUsernames: username } : {};

    const courses = await Course.find(query).sort({ createdAt: -1 }).limit(100);
    
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

// PUT update course details (code is immutable)
router.put('/:code', requireRoles([ROLE.ADMIN, ROLE.COURSE_ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const code = req.params.code?.trim();
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Course code required',
        message: 'Course code is required',
      });
    }

    const existing = await Course.findOne({ code });
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Course not found',
      });
    }

    const {
      courseName,
      courseDuration,
      startingDate,
      topics,
      weightage,
      subject,
      totalQuestions,
      questions,
      questionParts,
      questionPartMarks,
      compulsoryQuestions,
    } = req.body || {};

    if (courseName !== undefined) {
      if (!String(courseName).trim()) {
        return res.status(400).json({
          success: false,
          error: 'Course name required',
          message: 'Course name is required',
        });
      }
      existing.courseName = String(courseName).trim();
    }

    if (subject !== undefined) {
      existing.subject = String(subject).trim();
    }

    if (courseDuration !== undefined) {
      if (!courseDuration || !courseDuration.type || !courseDuration.value) {
        return res.status(400).json({
          success: false,
          error: 'Duration invalid',
          message: 'Course duration is required',
        });
      }
      existing.courseDuration = {
        type: String(courseDuration.type),
        value: Number(courseDuration.value),
      };
    }

    if (startingDate !== undefined) {
      if (!startingDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date required',
          message: 'Starting date is required',
        });
      }
      existing.startingDate = new Date(startingDate);
    }

    if (Array.isArray(weightage)) {
      if (weightage.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Weightage required',
          message: 'At least one weightage item is required',
        });
      }
      const normalizedWeightage = weightage.map((w) => ({
        label: (w?.label != null ? String(w.label) : '').trim(),
        percentage: Number(w?.percentage) || 0,
      }));
      const totalW = normalizedWeightage.reduce((s, w) => s + (Number(w.percentage) || 0), 0);
      if (Math.abs(totalW - 100) > 0.01) {
        return res.status(400).json({
          success: false,
          error: 'Weightage invalid',
          message: 'Weightage must total 100%',
        });
      }
      existing.weightage = normalizedWeightage;
    }

    if (Array.isArray(topics)) {
      if (topics.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Topics required',
          message: 'At least one topic is required',
        });
      }
      existing.topics = topics.map((t) => ({
        courseCode: (t?.courseCode != null ? String(t.courseCode) : '').trim(),
        topicName: (t?.topicName != null ? String(t.topicName) : '').trim(),
        description: (t?.description != null ? String(t.description) : '').trim(),
        marks: Number(t?.marks) || 0,
        grade: normalizeTopicGrade(t?.grade),
      }));
    }

    if (totalQuestions !== undefined) existing.totalQuestions = totalQuestions == null ? null : Number(totalQuestions);
    if (compulsoryQuestions !== undefined) existing.compulsoryQuestions = compulsoryQuestions == null ? null : Number(compulsoryQuestions);
    if (Array.isArray(questions)) existing.questions = questions;
    if (Array.isArray(questionParts)) existing.questionParts = questionParts;
    if (Array.isArray(questionPartMarks)) existing.questionPartMarks = questionPartMarks;

    // Prevent code changes explicitly
    if (req.body && req.body.code && String(req.body.code).trim() !== code) {
      return res.status(400).json({
        success: false,
        error: 'Course code immutable',
        message: 'Course code cannot be changed',
      });
    }

    await existing.save();
    await Record.updateMany({ courseCode: code }, { $set: { courseName: existing.courseName } });

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: existing.toObject(),
    });
  } catch (error) {
    console.error('Error updating course:', error);
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
      message: 'Failed to update course',
    });
  }
});

// DELETE all courses (and all records) – must be before /:code
router.delete('/', requireRoles([ROLE.ADMIN, ROLE.COURSE_ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }
    const courseResult = await Course.deleteMany({});
    await Record.deleteMany({});
    res.json({
      success: true,
      message: `Deleted ${courseResult.deletedCount} course(s) and all associated records.`,
      deletedCount: courseResult.deletedCount,
    });
  } catch (error) {
    console.error('Error deleting all courses:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete courses',
    });
  }
});

// DELETE a single course by code (and its record if any)
router.delete('/:code', requireRoles([ROLE.ADMIN, ROLE.COURSE_ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }
    const code = req.params.code?.trim();
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Course code required',
        message: 'Course code is required',
      });
    }
    const deleted = await Course.findOneAndDelete({ code });
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Course not found',
      });
    }
    await Record.deleteOne({ courseCode: code });
    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to delete course',
    });
  }
});

// Course educator assignments (Course Admin + Admin)
// PUT /api/courses/:code/educators
router.put('/:code/educators', requireRoles([ROLE.ADMIN, ROLE.COURSE_ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const code = req.params.code?.trim();
    if (!code) {
      return res.status(400).json({ success: false, error: 'Course code required', message: 'Course code is required' });
    }

    const educatorUsernames = Array.isArray(req.body?.educatorUsernames) ? req.body.educatorUsernames : [];
    const normalized = educatorUsernames.map((u) => String(u).trim()).filter(Boolean);
    const unique = [...new Set(normalized)];

    const course = await Course.findOne({ code });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'Course not found' });
    }

    // Validate educators exist and are role=EDUCATOR
    const educators = await User.find({ username: { $in: unique } }).lean();
    const educatorSet = new Set(educators.filter((u) => u.role === ROLE.EDUCATOR).map((u) => u.username));

    const invalid = unique.filter((u) => !educatorSet.has(u));
    if (invalid.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid educator(s)',
        message: 'All assigned educators must exist and have role EDUCATOR.',
        invalidUsernames: invalid,
      });
    }

    course.educatorUsernames = unique;
    await course.save();

    res.json({
      success: true,
      message: 'Course educators updated successfully',
      data: { code: course.code, educatorUsernames: course.educatorUsernames },
    });
  } catch (error) {
    console.error('Error updating course educators:', error);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to update educators' });
  }
});

// Admin-only: release final results for an entire course.
// POST /api/courses/:code/release-results
router.post('/:code/release-results', requireRoles([ROLE.ADMIN]), async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const code = req.params.code?.trim();
    if (!code) {
      return res.status(400).json({ success: false, error: 'Course code required', message: 'Course code is required' });
    }

    const course = await Course.findOne({ code });
    if (!course) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'Course not found' });
    }

    course.finalResultsReleased = true;
    course.finalResultsReleasedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: 'Final results released for this course.',
      data: { code: course.code, finalResultsReleased: course.finalResultsReleased },
    });
  } catch (error) {
    console.error('Error releasing results:', error);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to release results' });
  }
});

export default router;
