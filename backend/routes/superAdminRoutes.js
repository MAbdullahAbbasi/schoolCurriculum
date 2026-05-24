import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ROLE, SUPER_ADMIN_USERNAME } from '../rbac/roles.js';
import { requireRoles } from '../rbac/guards.js';
import { applyPasswordFields } from '../utils/userPassword.js';

const router = express.Router();

router.use(requireRoles([ROLE.SUPER_ADMIN]));

async function verifySuperAdminPassword(username, password) {
  if (!password || !String(password).trim()) return false;
  const user = await User.findOne({ username: String(username).trim() }).lean();
  if (!user?.passwordHash) return false;
  return bcrypt.compare(String(password), user.passwordHash);
}

const roleLabel = (role) => {
  if (role === ROLE.SUPER_ADMIN) return 'Root login';
  if (role === ROLE.ADMIN) return 'Admin';
  if (role === ROLE.COURSE_ADMIN) return 'Course admin';
  if (role === ROLE.EDUCATOR) return 'Educator';
  return role || '—';
};

// GET /api/super-admin/users — all logins with visible passwords
router.get('/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const users = await User.find({})
      .select({ username: 1, role: 1, passwordPlain: 1, createdAt: 1, updatedAt: 1 })
      .sort({ role: 1, username: 1 })
      .limit(500)
      .lean();

    res.json({
      success: true,
      data: users.map((u) => ({
        username: u.username,
        role: u.role,
        roleLabel: roleLabel(u.role),
        password: u.passwordPlain || '',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
    });
  } catch (err) {
    console.error('Super admin list users error:', err);
    res.status(500).json({ success: false, error: 'Failed to list users', message: err.message });
  }
});

// PUT /api/super-admin/users/:username — change any user's password
router.put('/users/:username', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const targetUsername = String(req.params.username || '').trim();
    const { password, superAdminPassword } = req.body || {};

    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Username required' });
    }
    if (!password || !String(password).trim()) {
      return res.status(400).json({ success: false, error: 'Password required', message: 'New password is required.' });
    }

    const ok = await verifySuperAdminPassword(req.user.username, superAdminPassword);
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: 'Invalid password',
        message: 'Your password is incorrect.',
      });
    }

    const existing = await User.findOne({ username: targetUsername });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Not found', message: 'User not found.' });
    }

    await applyPasswordFields(existing, password);
    await existing.save();

    res.json({
      success: true,
      message: `Password updated for "${targetUsername}".`,
      data: { username: existing.username, role: existing.role },
    });
  } catch (err) {
    console.error('Super admin update user error:', err);
    res.status(500).json({ success: false, error: 'Failed to update user', message: err.message });
  }
});

// PUT /api/super-admin/me/password — change own password
router.put('/me/password', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const { currentPassword, newPassword } = req.body || {};
    const username = req.user?.username;

    if (!newPassword || !String(newPassword).trim()) {
      return res.status(400).json({ success: false, error: 'Password required', message: 'New password is required.' });
    }

    const ok = await verifySuperAdminPassword(username, currentPassword);
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: 'Invalid password',
        message: 'Your current password is incorrect.',
      });
    }

    const user = await User.findOne({ username: String(username).trim() });
    if (!user) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }

    await applyPasswordFields(user, newPassword);
    await user.save();

    res.json({ success: true, message: 'Your password has been updated.' });
  } catch (err) {
    console.error('Super admin change own password error:', err);
    res.status(500).json({ success: false, error: 'Failed to update password', message: err.message });
  }
});

export { SUPER_ADMIN_USERNAME };

export default router;
