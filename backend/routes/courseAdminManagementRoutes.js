import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ROLE } from '../rbac/roles.js';
import { requireRoles } from '../rbac/guards.js';

const router = express.Router();

// Admin-only
router.use(requireRoles([ROLE.ADMIN]));

const requireAdminPassword = async (req, adminPassword) => {
  if (!adminPassword || !String(adminPassword).trim()) return false;
  const adminUser = await User.findOne({ username: String(req.user?.username || '').trim() }).lean();
  if (!adminUser || !adminUser.passwordHash) return false;
  return bcrypt.compare(String(adminPassword), adminUser.passwordHash);
};

// GET /api/admin/course-admins
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const admins = await User.find({ role: ROLE.COURSE_ADMIN })
      .select({ username: 1, role: 1, createdAt: 1, updatedAt: 1, _id: 0 })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({ success: true, data: admins });
  } catch (err) {
    console.error('Error fetching course admins:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to fetch course admins' });
  }
});

// POST /api/admin/course-admins
// Creates a COURSE_ADMIN. Requires adminPassword for authenticity.
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { username, password, adminPassword } = req.body || {};
    if (!username || !String(username).trim()) {
      return res.status(400).json({ success: false, error: 'Username required', message: 'username is required' });
    }
    if (!password || !String(password).trim()) {
      return res.status(400).json({ success: false, error: 'Password required', message: 'password is required' });
    }

    const ok = await requireAdminPassword(req, adminPassword);
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: 'Invalid admin password',
        message: 'Admin password is incorrect.',
      });
    }

    const u = String(username).trim();
    const existing = await User.findOne({ username: u });
    if (existing) {
      return res.status(409).json({ success: false, error: 'User exists', message: 'Username already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    await User.create({ username: u, passwordHash, role: ROLE.COURSE_ADMIN });

    res.status(201).json({ success: true, message: 'Course admin created successfully.' });
  } catch (err) {
    console.error('Error creating course admin:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err?.message || 'Failed to create course admin',
    });
  }
});

// PUT /api/admin/course-admins/:username
// Updates username and/or password. Requires adminPassword.
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
      return res.status(400).json({ success: false, error: 'Invalid username', message: 'Missing username.' });
    }

    const { newUsername, password, adminPassword } = req.body || {};
    const ok = await requireAdminPassword(req, adminPassword);
    if (!ok) {
      return res.status(403).json({ success: false, error: 'Invalid admin password', message: 'Admin password is incorrect.' });
    }

    const update = {};
    if (newUsername && String(newUsername).trim() && String(newUsername).trim() !== targetUsername) {
      const proposed = String(newUsername).trim();
      const collision = await User.findOne({ username: proposed });
      if (collision) {
        return res.status(409).json({ success: false, error: 'Username exists', message: 'The new username already exists.' });
      }
      update.username = proposed;
    }

    if (password && String(password).trim()) {
      update.passwordHash = await bcrypt.hash(String(password), 10);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update', message: 'Provide newUsername and/or password.' });
    }

    const updated = await User.findOneAndUpdate(
      { username: targetUsername, role: ROLE.COURSE_ADMIN },
      { $set: update },
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'Course admin not found.' });
    }

    res.json({ success: true, message: 'Course admin updated successfully.' });
  } catch (err) {
    console.error('Error updating course admin:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to update course admin' });
  }
});

// DELETE /api/admin/course-admins/all
router.delete('/all', async (req, res) => {
  try {
    const result = await User.deleteMany({ role: ROLE.COURSE_ADMIN });
    res.json({ success: true, message: 'All course admins deleted successfully.', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error deleting all course admins:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to delete course admins' });
  }
});

// POST /api/admin/course-admins/bulk-delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { usernames } = req.body || {};
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ success: false, error: 'Usernames required', message: 'Provide usernames array.' });
    }
    const cleaned = usernames.map((u) => String(u).trim()).filter(Boolean);
    const result = await User.deleteMany({ username: { $in: cleaned }, role: ROLE.COURSE_ADMIN });
    res.json({ success: true, message: 'Selected course admins deleted successfully.', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('Error bulk deleting course admins:', err);
    res.status(500).json({ success: false, error: 'Server error', message: 'Failed to delete course admins' });
  }
});

// DELETE /api/admin/course-admins/:username
router.delete('/:username', async (req, res) => {
  try {
    const targetUsername = req.params.username ? String(req.params.username).trim() : '';
    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Invalid username', message: 'Missing username.' });
    }

    const result = await User.deleteOne({ username: targetUsername, role: ROLE.COURSE_ADMIN });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'Course admin not found.' });
    }
    res.json({ success: true, message: 'Course admin deleted successfully.' });
  } catch (err) {
    console.error('Error deleting course admin:', err);
    res.status(500).json({ success: false, error: 'Server error', message: err?.message || 'Failed to delete course admin' });
  }
});

export default router;

