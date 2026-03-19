import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createToken } from '../middleware/authMiddleware.js';
import { ROLE } from '../rbac/roles.js';

const router = express.Router();

const SALT_ROUNDS = 10;

const ADMIN_PASSWORD = '$@pling';
const OLD_ADMIN_PASSWORD = 'sapling';

// Ensure sample user exists (username: sapling, password: $@pling)
const ensureSampleUser = async () => {
  if (mongoose.connection.readyState !== 1) return;
  const existing = await User.findOne({ username: 'sapling' });
  if (!existing) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    await User.create({
      username: 'sapling',
      passwordHash: hash,
      role: ROLE.ADMIN,
    });
    console.log('Created sample user: sapling / $@pling');
  } else {
    const stillOldPassword = await bcrypt.compare(OLD_ADMIN_PASSWORD, existing.passwordHash);
    if (stillOldPassword) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
      await User.updateOne({ username: 'sapling' }, { passwordHash: hash });
      console.log('Updated admin password to $@pling');
    }

    // Backfill missing role for older DBs
    if (!existing.role) {
      await User.updateOne({ username: 'sapling' }, { $set: { role: ROLE.ADMIN } });
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

    await ensureSampleUser();

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
