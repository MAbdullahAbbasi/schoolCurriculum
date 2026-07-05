export const ROLE = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  COURSE_ADMIN: 'COURSE_ADMIN',
  EDUCATOR: 'EDUCATOR',
  GUEST: 'GUEST',
};

export const ALL_ROLES = Object.values(ROLE);

export const SUPER_ADMIN_USERNAME = 'AdminSapling';

/** Demo account: view-only access for pitching the portal. */
export const GUEST_USERNAME = 'saplingGuest';
export const GUEST_PASSWORD = 'saplingGuest';

/** Roles that can browse admin-facing pages (guest is read-only). */
export const ADMIN_VIEW_ROLES = [ROLE.ADMIN, ROLE.COURSE_ADMIN, ROLE.GUEST];

