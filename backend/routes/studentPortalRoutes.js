import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import StudentData from '../models/StudentData.js';

const router = express.Router();

/**
 * Student portal login (separate from staff /api/auth).
 * Username = registrationNumber. Does not create staff User roles.
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

    return res.json({
      success: true,
      message: 'Student portal login successful.',
      portal: 'student',
      student: {
        registrationNumber: student.registrationNumber,
        studentName: student.studentName,
        grade: student.grade,
        email: student.email || '',
      },
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

export default router;
