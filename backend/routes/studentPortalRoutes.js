import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import StudentData from '../models/StudentData.js';
import Course from '../models/Course.js';
import Record from '../models/Record.js';
import { createStudentToken, requireStudentPortal } from '../middleware/authMiddleware.js';
import { normalizeGradeForMatch } from '../utils/gradePromotion.js';
import {
  buildStudentPortalCredentialFields,
  isValidStudentPortalPassword,
} from '../utils/studentPortalPassword.js';

const router = express.Router();

function formatStudentPublic(student) {
  return {
    registrationNumber: student.registrationNumber,
    studentName: student.studentName,
    fathersName: student.fathersName || '',
    grade: student.grade,
    subject: student.subject || '',
    email: student.email || '',
    dateOfBirth: student.dateOfBirth
      ? new Date(student.dateOfBirth).toISOString().split('T')[0]
      : null,
    portalAssigned: Boolean(student.portalAssigned),
  };
}

function studentBelongsToCourse(student, course) {
  const topics = Array.isArray(course?.topics) ? course.topics : [];
  const courseGrades = new Set(
    topics.map((t) => normalizeGradeForMatch(t?.grade)).filter(Boolean)
  );
  const studentGrade = normalizeGradeForMatch(student.grade);
  if (!studentGrade) return false;

  // Prefer explicit record membership (checked by caller); grade match for enrollment.
  if (courseGrades.size === 0) return false;
  if (!courseGrades.has(studentGrade)) return false;

  if (studentGrade === '8') {
    const sub = (course.subject && String(course.subject).trim()) || '';
    if (sub === 'Biology' || sub === 'Computer') {
      return ((student.subject && String(student.subject).trim()) || '') === sub;
    }
  }
  return true;
}

/**
 * Student portal login (separate from staff /api/auth).
 * Username = registrationNumber.
 */
router.post('/login', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    const username = String(req.body?.username || req.body?.registrationNumber || '').trim();
    const password = req.body?.password != null ? String(req.body.password) : '';

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Username (registration number) and password are required.',
      });
    }

    const student = await StudentData.findOne({ registrationNumber: username }).lean();
    if (!student?.portalAssigned || !student.portalPasswordHash) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Invalid username or password, or portal not assigned.',
      });
    }

    const ok = await bcrypt.compare(password, student.portalPasswordHash);
    if (!ok) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Invalid username or password.',
      });
    }

    const token = createStudentToken(student.registrationNumber);
    return res.json({
      success: true,
      message: 'Student portal login successful.',
      portal: 'student',
      token,
      user: {
        username: student.registrationNumber,
        role: 'STUDENT',
        portal: 'student',
        studentName: student.studentName,
      },
      student: formatStudentPublic(student),
    });
  } catch (error) {
    console.error('Student portal login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Login failed',
      message: error.message,
    });
  }
});

router.get('/me', requireStudentPortal, async (req, res) => {
  try {
    const student =
      req.student ||
      (await StudentData.findOne({
        registrationNumber: req.user.registrationNumber,
        portalAssigned: true,
      }).lean());
    if (!student) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    return res.json({
      success: true,
      portal: 'student',
      user: {
        username: student.registrationNumber,
        role: 'STUDENT',
        portal: 'student',
        studentName: student.studentName,
      },
      student: formatStudentPublic(student),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/refresh', requireStudentPortal, async (req, res) => {
  try {
    const reg = req.user.registrationNumber;
    const student = await StudentData.findOne({
      registrationNumber: reg,
      portalAssigned: true,
    }).lean();
    if (!student) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    return res.json({
      success: true,
      token: createStudentToken(reg),
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/dashboard', requireStudentPortal, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const student =
      req.student ||
      (await StudentData.findOne({
        registrationNumber: req.user.registrationNumber,
        portalAssigned: true,
      }).lean());
    if (!student) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const reg = student.registrationNumber;
    const [courses, records] = await Promise.all([
      Course.find({}).limit(500).lean(),
      Record.find({ 'students.registrationNumber': reg }).limit(200).lean(),
    ]);

    const recordByCourse = new Map();
    for (const rec of records) {
      const entry = (rec.students || []).find(
        (s) => String(s.registrationNumber) === String(reg)
      );
      if (entry) {
        recordByCourse.set(rec.courseCode, {
          overallPercentage: entry.overallPercentage,
          overallGrade: entry.overallGrade,
          marksLocked: Boolean(rec.marksLocked),
          courseName: rec.courseName,
        });
      }
    }

    const courseCards = [];
    const seen = new Set();

    for (const course of courses) {
      const inRecord = recordByCourse.has(course.code);
      const enrolled = studentBelongsToCourse(student, course);
      if (!inRecord && !enrolled) continue;
      seen.add(course.code);
      const mark = recordByCourse.get(course.code);
      courseCards.push({
        code: course.code,
        courseName: course.courseName,
        subject: course.subject || '',
        startingDate: course.startingDate,
        courseDuration: course.courseDuration,
        finalResultsReleased: Boolean(course.finalResultsReleased),
        hasMarks: Boolean(mark),
        marksLocked: mark?.marksLocked || false,
        overallPercentage: mark?.overallPercentage ?? null,
        overallGrade: mark?.overallGrade ?? null,
        topicCount: Array.isArray(course.topics) ? course.topics.length : 0,
      });
    }

    // Orphan records (course deleted) still show
    for (const [code, mark] of recordByCourse.entries()) {
      if (seen.has(code)) continue;
      courseCards.push({
        code,
        courseName: mark.courseName || code,
        subject: '',
        startingDate: null,
        courseDuration: null,
        finalResultsReleased: true,
        hasMarks: true,
        marksLocked: mark.marksLocked,
        overallPercentage: mark.overallPercentage,
        overallGrade: mark.overallGrade,
        topicCount: 0,
      });
    }

    courseCards.sort((a, b) => String(a.courseName).localeCompare(String(b.courseName)));

    const withMarks = courseCards.filter((c) => c.hasMarks && c.overallPercentage != null);
    const avgPercentage =
      withMarks.length > 0
        ? Math.round(
            (withMarks.reduce((sum, c) => sum + Number(c.overallPercentage || 0), 0) /
              withMarks.length) *
              100
          ) / 100
        : null;

    return res.json({
      success: true,
      student: formatStudentPublic(student),
      stats: {
        courseCount: courseCards.length,
        markedCourseCount: withMarks.length,
        averagePercentage: avgPercentage,
      },
      courses: courseCards,
    });
  } catch (error) {
    console.error('Student portal dashboard error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
      message: error.message,
    });
  }
});

router.post('/change-password', requireStudentPortal, async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const currentPassword =
      req.body?.currentPassword != null ? String(req.body.currentPassword) : '';
    const newPassword = req.body?.newPassword != null ? String(req.body.newPassword) : '';

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Current password and new password are required.',
      });
    }
    if (!isValidStudentPortalPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message:
          'New password must be exactly 8 characters and include uppercase, lowercase, a number, and a special character.',
      });
    }

    const reg = req.user.registrationNumber;
    const student = await StudentData.findOne({
      registrationNumber: reg,
      portalAssigned: true,
    });
    if (!student?.portalPasswordHash) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Portal account not found.',
      });
    }

    const ok = await bcrypt.compare(currentPassword, student.portalPasswordHash);
    if (!ok) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Current password is incorrect.',
      });
    }

    const fields = await buildStudentPortalCredentialFields(newPassword);
    student.portalPasswordHash = fields.portalPasswordHash;
    student.portalPasswordDisplay = fields.portalPasswordDisplay;
    // Keep portalAssigned / assignedAt; do not reset assignedAt on password change
    await student.save();

    return res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    console.error('Student portal change-password error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to change password',
      message: error.message,
    });
  }
});

export default router;
