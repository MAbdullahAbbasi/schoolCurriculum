import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ROLE } from '../rbac/roles.js';
import { requireRoles } from '../rbac/guards.js';

const router = express.Router();

const SALT_ROUNDS = 10;

// All endpoints in this router are Admin-only.
router.use(requireRoles([ROLE.ADMIN]));

// GET /api/admin/users
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const users = await User.find({})
      .select({ username: 1, role: 1, createdAt: 1, updatedAt: 1 })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    res.json({ success: true, data: users });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to list users' });
  }
});

// POST /api/admin/users
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { username, password, role } = req.body || {};
    if (!username || !String(username).trim()) {
      return res.status(400).json({ success: false, error: 'Username required', message: 'username is required' });
    }
    if (!password || !String(password).trim()) {
      return res.status(400).json({ success: false, error: 'Password required', message: 'password is required' });
    }

    const requestedRole = role || ROLE.EDUCATOR;
    const allowedRoles = Object.values(ROLE);
    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({ success: false, error: 'Invalid role', message: 'Invalid role.' });
    }

    const u = String(username).trim();
    const existing = await User.findOne({ username: u });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: `User "${u}" already exists.`,
      });
    }

    const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    const created = await User.create({
      username: u,
      passwordHash,
      role: requestedRole,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully.',
      data: { username: created.username, role: created.role },
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to create user' });
  }
});

// PUT /api/admin/users/:username
router.put('/:username', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const targetUsername = req.params.username ? String(req.params.username).trim() : '';
    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Username required', message: 'Invalid username.' });
    }

    const { role, password } = req.body || {};
    const update = {};

    if (role !== undefined) {
      const requestedRole = role;
      const allowedRoles = Object.values(ROLE);
      if (!allowedRoles.includes(requestedRole)) {
        return res.status(400).json({ success: false, error: 'Invalid role', message: 'Invalid role.' });
      }
      update.role = requestedRole;
    }

    if (password !== undefined) {
      if (!String(password).trim()) {
        return res.status(400).json({ success: false, error: 'Invalid password', message: 'Password cannot be empty.' });
      }
      update.passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update', message: 'Provide role and/or password.' });
    }

    // Backfill missing roles (older DBs)
    const existing = await User.findOne({ username: targetUsername }).lean();
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'User not found.' });
    }
    if (!existing.role && update.role === undefined) {
      update.role = ROLE.ADMIN;
    }

    const updated = await User.findOneAndUpdate({ username: targetUsername }, update, { new: true }).select({ passwordHash: 0 }).lean();

    res.json({ success: true, message: 'User updated successfully.', data: updated });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to update user' });
  }
});

// DELETE /api/admin/users/:username
router.delete('/:username', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const targetUsername = req.params.username ? String(req.params.username).trim() : '';
    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Username required', message: 'Invalid username.' });
    }

    if (targetUsername === 'sapling') {
      return res.status(400).json({ success: false, error: 'Not allowed', message: 'Cannot delete the default admin user.' });
    }

    const adminCount = await User.countDocuments({ role: ROLE.ADMIN });
    if (adminCount <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Not allowed',
        message: 'Cannot delete the last Admin user.',
      });
    }

    const deleted = await User.findOneAndDelete({ username: targetUsername }).lean();
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'User not found.' });
    }

    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to delete user' });
  }
});

export default router;

