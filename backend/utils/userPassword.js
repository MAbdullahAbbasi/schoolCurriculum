import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), SALT_ROUNDS);
}

/** Set bcrypt hash and plain-text copy (for super-admin password management). */
export async function applyPasswordFields(updateOrDoc, plainPassword) {
  const plain = String(plainPassword);
  const passwordHash = await hashPassword(plain);
  if (typeof updateOrDoc === 'object' && updateOrDoc !== null) {
    updateOrDoc.passwordHash = passwordHash;
    updateOrDoc.passwordPlain = plain;
  }
  return { passwordHash, passwordPlain: plain };
}
