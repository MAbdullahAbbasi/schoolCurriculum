import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createToken } from '../middleware/authMiddleware.js';
import { ROLE } from '../rbac/roles.js';
import Course from '../models/Course.js';

const router = express.Router();

const SALT_ROUNDS = 10;

const ADMIN_PASSWORD = '$@pling';
const OLD_ADMIN_PASSWORD = 'sapling';

// Default demo users (created automatically if missing)
const COURSE_ADMIN_USERNAME = 'courseadmin';
const COURSE_ADMIN_PASSWORD = 'CourseAdmin#1';
const EDUCATOR_USERNAME = 'educator';
const EDUCATOR_PASSWORD = 'Educator#1';

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

    // Backfill missing role for older DBs
    if (!adminExisting.role) {
      await User.updateOne({ username: 'sapling' }, { $set: { role: ROLE.ADMIN } });
    }
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
    });
    console.log(`Created sample user: ${EDUCATOR_USERNAME} / ${EDUCATOR_PASSWORD}`);
  }

  // For demo/testing: if courses have no educators assigned yet,
  // assign the default educator automatically.
  await Course.updateMany(
    { educatorUsernames: { $size: 0 } },
    { $set: { educatorUsernames: [EDUCATOR_USERNAME] } }
  );
  // Also handle legacy docs where educatorUsernames might be missing.
  await Course.updateMany(
    { educatorUsernames: { $exists: false } },
    { $set: { educatorUsernames: [EDUCATOR_USERNAME] } }
  );
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
    res.json({
      success: true,
      message: 'Login successful',
      user: { username: user.username, role: user.role || ROLE.EDUCATOR },
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
