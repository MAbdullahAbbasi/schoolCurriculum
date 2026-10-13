import express from 'express';
import crypto from 'crypto';
import AppUpdate from '../models/AppUpdate.js';
import { requireRoles } from '../rbac/guards.js';
import { ROLE } from '../rbac/roles.js';
import {
  syncAppUpdatesFromSource,
  upsertFromGithubPushPayload,
} from '../utils/githubCommits.js';

const router = express.Router();

function parseDateBoundary(value, endOfDay = false) {
  if (value == null || String(value).trim() === '') return null;
  const raw = String(value).trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * GET /api/updates
 * List updates for Admin / Super Admin with optional date filters.
 * Auto-syncs from GitHub/git when the collection is empty.
 */
router.get('/', requireRoles([ROLE.ADMIN, ROLE.SUPER_ADMIN]), async (req, res) => {
  try {
    const count = await AppUpdate.countDocuments();
    if (count === 0) {
      try {
        await syncAppUpdatesFromSource();
      } catch (syncErr) {
        console.warn('Initial updates sync failed:', syncErr.message);
      }
    }

    const from = parseDateBoundary(req.query.from, false);
    const to = parseDateBoundary(req.query.to, true);
    const filter = {};
    if (from || to) {
      filter.committedAt = {};
      if (from) filter.committedAt.$gte = from;
      if (to) filter.committedAt.$lte = to;
    }

    const updates = await AppUpdate.find(filter)
      .sort({ committedAt: -1 })
      .lean();

    const rows = updates.map((u, index) => ({
      id: u._id,
      serialNumber: index + 1,
      message: u.message,
      originalSubject: u.originalSubject,
      authorName: u.authorName,
      committedAt: u.committedAt,
      commitSha: u.commitSha,
      htmlUrl: u.htmlUrl,
      source: u.source,
    }));

    return res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('List updates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load updates',
      message: error.message,
    });
  }
});

/**
 * POST /api/updates/sync
 * Pull latest commits from GitHub (or local git fallback) into the database.
 */
router.post('/sync', requireRoles([ROLE.ADMIN, ROLE.SUPER_ADMIN]), async (req, res) => {
  try {
    const stats = await syncAppUpdatesFromSource();
    return res.json({
      success: true,
      message: 'Updates synced successfully.',
      ...stats,
    });
  } catch (error) {
    console.error('Sync updates error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync updates',
      message: error.message,
    });
  }
});

/**
 * Verify optional GitHub webhook signature.
 */
function verifyGithubSignature(req) {
  const secret = String(process.env.GITHUB_WEBHOOK_SECRET || '').trim();
  if (!secret) return true; // allow if not configured (still public route)
  const signature = req.headers['x-hub-signature-256'];
  if (!signature || !req.rawBody) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(req.rawBody);
  const digest = `sha256=${hmac.digest('hex')}`;
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(signature)));
  } catch (_) {
    return false;
  }
}

/**
 * POST /api/updates/github-webhook
 * Public webhook for GitHub push events.
 */
router.post('/github-webhook', async (req, res) => {
  try {
    if (!verifyGithubSignature(req)) {
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }
    const event = req.headers['x-github-event'];
    if (event && event !== 'push' && event !== 'ping') {
      return res.json({ success: true, message: `Ignored event: ${event}` });
    }
    if (event === 'ping') {
      return res.json({ success: true, message: 'Webhook ping received' });
    }
    const stats = await upsertFromGithubPushPayload(req.body || {});
    return res.json({
      success: true,
      message: 'Push updates recorded.',
      ...stats,
    });
  } catch (error) {
    console.error('GitHub webhook error:', error);
    return res.status(500).json({
      success: false,
      error: 'Webhook processing failed',
      message: error.message,
    });
  }
});

export default router;
