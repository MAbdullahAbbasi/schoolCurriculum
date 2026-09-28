import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import StudentData from '../models/StudentData.js';
import { ROLE } from '../rbac/roles.js';

const JWT_SECRET = process.env.JWT_SECRET || 'school-curriculum-secret-change-in-production';
const JWT_EXPIRY = '20m';

export const createToken = (username) => {
  return jwt.sign(
    { username },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

/** Student portal JWT — never creates a staff User role. */
export const createStudentToken = (registrationNumber) => {
  const reg = String(registrationNumber).trim();
  return jwt.sign(
    {
      portal: 'student',
      registrationNumber: reg,
      username: reg,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_) {
    return null;
  }
};

/**
 * Protects /api/* routes. Skips staff login and student-portal login.
 * Supports staff User JWTs and student portal JWTs (portal: 'student').
 */
export const authMiddleware = async (req, res, next) => {
  const url = req.originalUrl || req.url || '';
  const isStaffLogin = (url === '/api/auth/login' || url.endsWith('/auth/login')) && req.method === 'POST';
  const isStudentPortalLogin =
    (url === '/api/student-portal/login' || url.endsWith('/student-portal/login')) &&
    req.method === 'POST';
  if (isStaffLogin || isStudentPortalLogin) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
      message: 'Login required. Token missing.',
    });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
      message: 'Invalid or expired token. Please log in again.',
    });
  }

  // Student portal session
  if (payload.portal === 'student') {
    const reg = String(payload.registrationNumber || payload.username || '').trim();
    if (!reg) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Invalid student token payload.',
      });
    }
    const student = await StudentData.findOne({
      registrationNumber: reg,
      portalAssigned: true,
    }).lean();
    if (!student) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Student portal account no longer available.',
      });
    }
    req.student = student;
    req.user = {
      role: 'STUDENT',
      portal: 'student',
      username: reg,
      registrationNumber: reg,
      studentName: student.studentName,
    };
    return next();
  }

  const username = payload?.username;
  if (!username) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
      message: 'Invalid token payload.',
    });
  }

  const dbUser = await User.findOne({ username: String(username).trim() }).lean();
  if (!dbUser) {
    return res.status(401).json({
      success: false,
      error: 'Not authenticated',
      message: 'User no longer exists.',
    });
  }

  req.user = {
    userId: dbUser._id?.toString?.() ?? String(dbUser._id),
    username: dbUser.username,
    role: dbUser.role || ROLE.EDUCATOR,
  };
  return next();
};

export const requireStudentPortal = (req, res, next) => {
  if (req.user?.role !== 'STUDENT' || req.user?.portal !== 'student') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Student portal access required.',
    });
  }
  return next();
};
