import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Course from '../models/Course.js';
import { ROLE } from '../rbac/roles.js';
import { requireRoles } from '../rbac/guards.js';

const router = express.Router();

// Admin-only educator management
router.use(requireRoles([ROLE.ADMIN]));

const SALT_ROUNDS = 10;

const requireAdminPassword = async (req, adminPassword) => {
  if (!adminPassword || !String(adminPassword).trim()) return false;
  const adminUser = await User.findOne({ username: String(req.user?.username || '').trim() }).lean();
  if (!adminUser || !adminUser.passwordHash) return false;
  return bcrypt.compare(String(adminPassword), adminUser.passwordHash);
};

// GET /api/admin/educators
router.get('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const educators = await User.find({ role: ROLE.EDUCATOR })
      .select({ username: 1, grade: 1, subject: 1, role: 1, createdAt: 1, updatedAt: 1, _id: 0 })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    res.json({ success: true, data: educators });
  } catch (err) {
    console.error('Error fetching educators:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'Failed to fetch educators',
    });
  }
});

// POST /api/admin/educators
router.post('/', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database not connected',
        message: 'Database connection failed',
      });
    }

    const { username, password, adminPassword, grade, subject } = req.body || {};
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

    const created = await User.create({
      username: u,
      passwordHash: await bcrypt.hash(String(password), SALT_ROUNDS),
      role: ROLE.EDUCATOR,
      grade: grade != null ? String(grade).trim() : '',
      subject: subject != null ? String(subject).trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Educator created successfully.',
      data: { username: created.username, grade: created.grade, subject: created.subject },
    });
  } catch (err) {
    console.error('Error creating educator:', err);
    res.status(500).json({
      success: false,
      error: 'Server error',
      message: err?.message || 'Failed to create educator',
    });
  }
});

// PUT /api/admin/educators/:username
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

    const { newUsername, password, adminPassword, grade, subject } = req.body || {};

    const ok = await requireAdminPassword(req, adminPassword);
    if (!ok) {
      return res.status(403).json({ success: false, error: 'Invalid admin password', message: 'Admin password is incorrect.' });
    }

    const educator = await User.findOne({ username: targetUsername, role: ROLE.EDUCATOR }).lean();
    if (!educator) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'Educator not found.' });
    }

    const update = {};
    let finalUsername = targetUsername;

    if (newUsername && String(newUsername).trim() && String(newUsername).trim() !== targetUsername) {
      const proposed = String(newUsername).trim();
      const collision = await User.findOne({ username: proposed });
      if (collision) {
        return res.status(409).json({ success: false, error: 'Username exists', message: 'The new username already exists.' });
      }
      finalUsername = proposed;
      update.username = proposed;
    }

    if (grade !== undefined) update.grade = grade != null ? String(grade).trim() : '';
    if (subject !== undefined) update.subject = subject != null ? String(subject).trim() : '';

    if (password !== undefined && String(password).trim()) {
      update.passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, error: 'Nothing to update', message: 'Provide newUsername and/or password/grade/subject.' });
    }

    const updated = await User.findOneAndUpdate(
      { username: targetUsername, role: ROLE.EDUCATOR },
      { $set: update },
      { new: true }
    ).lean();

    // If username changed, update educatorUsernames across courses.
    if (finalUsername !== targetUsername) {
      await Course.updateMany({ educatorUsernames: targetUsername }, { $addToSet: { educatorUsernames: finalUsername } });
      await Course.updateMany({ educatorUsernames: targetUsername }, { $pull: { educatorUsernames: targetUsername } });
    }

    res.json({ success: true, message: 'Educator updated successfully.' });
  } catch (err) {
    console.error('Error updating educator:', err);
    res.status(500).json({ success: false, error: 'Server error', message: err?.message || 'Failed to update educator' });
  }
});

// Helper for delete: remove usernames from all course educator lists
const pullEducatorsFromCourses = async (usernames) => {
  const cleaned = usernames.map((u) => String(u).trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  await Course.updateMany(
    { educatorUsernames: { $in: cleaned } },
    { $pull: { educatorUsernames: { $in: cleaned } } }
  );
};

// POST /api/admin/educators/bulk-delete
router.post('/bulk-delete', async (req, res) => {
  try {
    const { usernames } = req.body || {};
    if (!Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({ success: false, error: 'Usernames required', message: 'Provide usernames array.' });
    }

    const cleaned = usernames.map((u) => String(u).trim()).filter(Boolean);
    const toDelete = await User.find({ username: { $in: cleaned }, role: ROLE.EDUCATOR }).select('username').lean();
    const toDeleteUsernames = toDelete.map((u) => u.username);

    await User.deleteMany({ username: { $in: toDeleteUsernames }, role: ROLE.EDUCATOR });
    await pullEducatorsFromCourses(toDeleteUsernames);

    res.json({
      success: true,
      message: 'Selected educators deleted successfully.',
      deletedCount: toDeleteUsernames.length,
    });
  } catch (err) {
    console.error('Error bulk deleting educators:', err);
    res.status(500).json({ success: false, error: 'Server error', message: err?.message || 'Failed to delete educators' });
  }
});

// DELETE /api/admin/educators/all
router.delete('/all', async (req, res) => {
  try {
    const educators = await User.find({ role: ROLE.EDUCATOR }).select('username').lean();
    const usernames = educators.map((u) => u.username);
    await User.deleteMany({ role: ROLE.EDUCATOR });
    await pullEducatorsFromCourses(usernames);
    res.json({ success: true, message: 'All educators deleted successfully.', deletedCount: usernames.length });
  } catch (err) {
    console.error('Error deleting all educators:', err);
    res.status(500).json({ success: false, error: 'Server error', message: err?.message || 'Failed to delete educators' });
  }
});

// DELETE /api/admin/educators/:username
router.delete('/:username', async (req, res) => {
  try {
    const targetUsername = req.params.username ? String(req.params.username).trim() : '';
    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Invalid username', message: 'Missing username.' });
    }

    const result = await User.deleteOne({ username: targetUsername, role: ROLE.EDUCATOR });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'Educator not found.' });
    }

    await pullEducatorsFromCourses([targetUsername]);

    res.json({ success: true, message: 'Educator deleted successfully.' });
  } catch (err) {
    console.error('Error deleting educator:', err);
    res.status(500).json({ success: false, error: 'Server error', message: err?.message || 'Failed to delete educator' });
  }
});

export default router;

