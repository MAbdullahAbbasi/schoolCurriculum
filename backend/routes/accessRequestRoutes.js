import express from 'express';
import { isMailConfigured, sendAccessRequestEmail } from '../utils/mailer.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const recentByKey = new Map();

function clientKey(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : String(forwarded || '')
        .split(',')[0]
        .trim() ||
      req.ip ||
      'unknown';
  return ip;
}

function isRateLimited(key) {
  const now = Date.now();
  const stamps = (recentByKey.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (stamps.length >= RATE_MAX) {
    recentByKey.set(key, stamps);
    return true;
  }
  stamps.push(now);
  recentByKey.set(key, stamps);
  return false;
}

/**
 * POST /api/access-requests
 * Public: visitor submits registered email; admin is notified by email.
 */
router.post('/', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.',
      });
    }

    if (isRateLimited(clientKey(req))) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
      });
    }

    if (!isMailConfigured()) {
      return res.status(503).json({
        success: false,
        error:
          'Access requests are not available yet. Email delivery has not been configured by the school administrator.',
      });
    }

    await sendAccessRequestEmail({ requesterEmail: email });

    return res.json({
      success: true,
      message: 'Your request was sent. An administrator will be notified.',
    });
  } catch (err) {
    console.error('Access request email failed:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: 'Could not send the access request. Please try again later.',
    });
  }
});

export default router;
