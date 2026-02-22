import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'school-curriculum-secret-change-in-production';
const JWT_EXPIRY = '2m';

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
 * Protects /api/* routes. Skips POST /api/auth/login.
 * On valid token: sets X-New-Token (sliding 2 min), then next().
 * On missing/invalid/expired token: 401.
 */
export const authMiddleware = (req, res, next) => {
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

  req.user = payload;
  const newToken = createToken(payload.username);
  res.setHeader('X-New-Token', newToken);
  next();
};
