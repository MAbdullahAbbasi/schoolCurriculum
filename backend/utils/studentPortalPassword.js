import crypto from 'crypto';
import { hashPassword } from './userPassword.js';

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*?';
const ALL = UPPER + LOWER + DIGITS + SPECIAL;

function pickChar(charset) {
  return charset[crypto.randomInt(0, charset.length)];
}

function shuffleInPlace(chars) {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars;
}

/**
 * Cryptographically random 8-char password with upper, lower, digit, and special.
 * Not derived from student personal data.
 */
export function generateStudentPortalPassword() {
  const chars = [
    pickChar(UPPER),
    pickChar(LOWER),
    pickChar(DIGITS),
    pickChar(SPECIAL),
    pickChar(ALL),
    pickChar(ALL),
    pickChar(ALL),
    pickChar(ALL),
  ];
  return shuffleInPlace(chars).join('');
}

/** Exactly 8 chars; must include upper, lower, digit, and special. */
export function isValidStudentPortalPassword(password) {
  if (typeof password !== 'string' || password.length !== 8) return false;
  if (/\s/.test(password)) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}

/** Hash + display copy for admin UI (hash used for future student login). */
export async function buildStudentPortalCredentialFields(plainPassword) {
  const plain = String(plainPassword);
  const portalPasswordHash = await hashPassword(plain);
  return {
    portalAssigned: true,
    portalPasswordHash,
    portalPasswordDisplay: plain,
    portalAssignedAt: new Date(),
  };
}

export async function createGeneratedPortalFields() {
  const plain = generateStudentPortalPassword();
  const fields = await buildStudentPortalCredentialFields(plain);
  return { plain, fields };
}
