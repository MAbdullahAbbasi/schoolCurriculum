export const AUTH_KEY = 'curriculum_auth';

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

export function getAuthRole() {
  return getStoredAuth()?.role || null;
}

export function isGuestRole(role = getAuthRole()) {
  return role === 'GUEST';
}

/** True when the user may change data in the portal (not a demo guest). */
export function canEditPortal(role = getAuthRole()) {
  return role != null && role !== 'GUEST';
}

/** Admin-facing pages (objectives, grove, reports) — includes read-only guest. */
export function hasAdminViewAccess(role = getAuthRole()) {
  return role === 'ADMIN' || role === 'COURSE_ADMIN' || role === 'GUEST';
}

/** Full admin navigation (grove, seedlings) — guest included for demos. */
export function hasAdminNavAccess(role = getAuthRole()) {
  return role === 'ADMIN' || role === 'GUEST';
}
