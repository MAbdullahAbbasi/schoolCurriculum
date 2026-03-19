import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'school-curriculum-secret-change-in-production';
const JWT_EXPIRY = '20m';

export const createToken = (username) => {
  return jwt.sign(
    { username },
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
 * Protects /api/* routes. Skips only POST /api/auth/login.
 * On valid token: next(). Token expiry is 20m and is NOT extended on normal API calls.
 * Client uses inactivity timer and calls GET /api/auth/refresh when user is active to extend session.
 */
export const authMiddleware = async (req, res, next) => {
  const url = req.originalUrl || req.url || '';
  const isLogin = (url === '/api/auth/login' || url.endsWith('/auth/login')) && req.method === 'POST';
  if (isLogin) {
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
    // Security default: if a legacy user record is missing `role`, treat as the least-privileged role.
    role: dbUser.role || 'EDUCATOR',
  };
  return next();
};
