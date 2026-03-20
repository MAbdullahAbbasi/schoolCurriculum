import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createToken } from '../middleware/authMiddleware.js';
import { ROLE } from '../rbac/roles.js';
import Course from '../models/Course.js';
import { normalizeGradeForMatch, normalizeSubjectForMatch } from '../rbac/guards.js';

const router = express.Router();

const SALT_ROUNDS = 10;

const ADMIN_PASSWORD = '$@pling';
const OLD_ADMIN_PASSWORD = 'sapling';

// Default demo users (created automatically if missing)
const COURSE_ADMIN_USERNAME = 'courseadmin';
const COURSE_ADMIN_PASSWORD = 'CourseAdmin#1';
const EDUCATOR_USERNAME = 'educator';
const EDUCATOR_PASSWORD = 'Educator#1';
const DEFAULT_EDUCATOR_GRADE = 'KG-II';
const DEFAULT_EDUCATOR_SUBJECT = 'Computer';

// Ensure sample user exists (username: sapling, password: $@pling)
const ensureSampleUsers = async () => {
  if (mongoose.connection.readyState !== 1) return;

  // ADMIN
  const adminExisting = await User.findOne({ username: 'sapling' });
  if (!adminExisting) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    await User.create({
      username: 'sapling',
      passwordHash: hash,
      role: ROLE.ADMIN,
    });
    console.log('Created sample user: sapling / $@pling');
  } else {
    const stillOldPassword = await bcrypt.compare(OLD_ADMIN_PASSWORD, adminExisting.passwordHash);
    if (stillOldPassword) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
      await User.updateOne({ username: 'sapling' }, { passwordHash: hash });
      console.log('Updated admin password to $@pling');
    }

    // Force role for the legacy super admin user.
    // (Older DBs may have stored an incorrect/missing `role` value.)
    await User.updateOne({ username: 'sapling' }, { $set: { role: ROLE.ADMIN } });
  }

  // COURSE_ADMIN
  const courseAdminExisting = await User.findOne({ username: COURSE_ADMIN_USERNAME });
  if (!courseAdminExisting) {
    const hash = await bcrypt.hash(COURSE_ADMIN_PASSWORD, SALT_ROUNDS);
    await User.create({
      username: COURSE_ADMIN_USERNAME,
      passwordHash: hash,
      role: ROLE.COURSE_ADMIN,
    });
    console.log(`Created sample user: ${COURSE_ADMIN_USERNAME} / ${COURSE_ADMIN_PASSWORD}`);
  }

  // EDUCATOR
  const educatorExisting = await User.findOne({ username: EDUCATOR_USERNAME });
  if (!educatorExisting) {
    const hash = await bcrypt.hash(EDUCATOR_PASSWORD, SALT_ROUNDS);
    await User.create({
      username: EDUCATOR_USERNAME,
      passwordHash: hash,
      role: ROLE.EDUCATOR,
      grade: DEFAULT_EDUCATOR_GRADE, // legacy
      subject: DEFAULT_EDUCATOR_SUBJECT, // legacy
      educatorAssignments: [{ grade: DEFAULT_EDUCATOR_GRADE, subject: DEFAULT_EDUCATOR_SUBJECT }],
    });
    console.log(`Created sample user: ${EDUCATOR_USERNAME} / ${EDUCATOR_PASSWORD}`);
  }

  // For demo/testing: auto-assign the default educator to only those courses
  // whose `subject` and topic `grade` match the educator's configured grade+subject.
  const educator = await User.findOne({ username: EDUCATOR_USERNAME }).lean();
  const assignments = Array.isArray(educator?.educatorAssignments) ? educator.educatorAssignments : [];
  const legacyPair = educator?.grade && educator?.subject ? [{ grade: educator.grade, subject: educator.subject }] : [];
  const pairs = [...assignments, ...legacyPair]
    .map((p) => ({
      grade: normalizeGradeForMatch(p?.grade),
      subject: normalizeSubjectForMatch(p?.subject),
    }))
    .filter((p) => p.grade && p.subject);

  if (pairs.length > 0) {
    const candidates = await Course.find({
      $or: [{ educatorUsernames: { $exists: false } }, { educatorUsernames: { $size: 0 } }],
    }).lean();

    // Assign only matching courses (avoid updating non-matching ones).
    for (const c of candidates) {
      const courseSubjectNorm = normalizeSubjectForMatch(c?.subject);

      const topicGrades = Array.isArray(c?.topics) ? c.topics : [];
      const topicGradeNorms = topicGrades.map((t) => normalizeGradeForMatch(t?.grade));

      const matchesAnyPair = pairs.some((pair) => {
        if (pair.subject !== courseSubjectNorm) return false;
        return topicGradeNorms.some((g) => g === pair.grade);
      });

      if (!matchesAnyPair) continue;

      await Course.updateOne({ _id: c._id }, { $set: { educatorUsernames: [EDUCATOR_USERNAME] } });
    }
  }
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
      });
    }

    await ensureSampleUsers();

    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      });
    }

    const user = await User.findOne({ username: String(username).trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const match = await bcrypt.compare(String(password), user.passwordHash);
    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      });
    }

    const token = createToken(user.username);
    const computedRole =
      String(user.username) === 'sapling' ? ROLE.ADMIN : user.role || ROLE.EDUCATOR;
    res.json({
      success: true,
      message: 'Login successful',
      user: { username: user.username, role: computedRole },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      message: err.message,
    });
  }
});

// GET /api/auth/me - requires valid token (role-based dashboards)
router.get('/me', (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    res.json({
      success: true,
      user: {
        username: req.user.username,
        role: req.user.role || ROLE.EDUCATOR,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load user', message: err.message });
  }
});

// GET /api/auth/refresh - requires valid token, returns new token (20m from now)
router.get('/refresh', (req, res) => {
  try {
    if (!req.user || !req.user.username) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    const token = createToken(req.user.username);
    res.json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Refresh failed', message: err.message });
  }
});

export default router;
