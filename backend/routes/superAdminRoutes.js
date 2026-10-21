import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import StudentData from '../models/StudentData.js';
import Course from '../models/Course.js';
import { ROLE, SUPER_ADMIN_USERNAME } from '../rbac/roles.js';
import { requireRoles, normalizeGradeForMatch } from '../rbac/guards.js';
import { applyPasswordFields } from '../utils/userPassword.js';
import {
  buildStudentPortalCredentialFields,
  isValidStudentPortalPassword,
} from '../utils/studentPortalPassword.js';

const router = express.Router();

router.use(requireRoles([ROLE.SUPER_ADMIN]));

/** Canonical class/grade values used across the school ladder. */
const CLASS_FILTER_OPTIONS = [
  'KG-2',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

async function verifySuperAdminPassword(username, password) {
  if (!password || !String(password).trim()) return false;
  const user = await User.findOne({ username: String(username).trim() }).lean();
  if (!user?.passwordHash) return false;
  return bcrypt.compare(String(password), user.passwordHash);
}

const roleLabel = (role) => {
  if (role === ROLE.SUPER_ADMIN) return 'Root Admin';
  if (role === ROLE.ADMIN) return 'Admin';
  if (role === ROLE.COURSE_ADMIN) return 'Course Admin';
  if (role === ROLE.EDUCATOR) return 'Educator';
  if (role === ROLE.GUEST) return 'Guest';
  if (role === 'STUDENT') return 'Student';
  return role || '—';
};

function uniqueSortedGrades(grades) {
  const map = new Map();
  for (const g of grades || []) {
    const raw = g == null ? '' : String(g).trim();
    if (!raw) continue;
    const canon = normalizeGradeForMatch(raw) || raw;
    if (!map.has(canon)) map.set(canon, raw);
  }
  return Array.from(map.entries())
    .sort((a, b) => {
      const order = (c) => {
        if (c === 'KG-2') return 0;
        if (c === 'KG-1') return -1;
        if (c === 'KG-3') return 1;
        const n = parseInt(c, 10);
        return Number.isNaN(n) ? 1000 : 10 + n;
      };
      return order(a[0]) - order(b[0]) || String(a[1]).localeCompare(String(b[1]));
    })
    .map(([, display]) => normalizeGradeForMatch(display) || display);
}

function classLabelFromGrades(grades) {
  const list = uniqueSortedGrades(grades);
  if (!list.length) return 'Not Assigned';
  return list.join(', ');
}

function gradesIncludeClass(grades, classFilter) {
  if (!classFilter) return true;
  const want = normalizeGradeForMatch(classFilter);
  if (!want) return true;
  return uniqueSortedGrades(grades).some((g) => normalizeGradeForMatch(g) === want);
}

/**
 * Build educator username → class list from assignments + assigned courses' topic grades.
 */
async function buildEducatorClassMap(educatorUsernames) {
  const map = new Map();
  for (const u of educatorUsernames) map.set(u, new Set());

  if (!educatorUsernames.length) return map;

  const courses = await Course.find({ educatorUsernames: { $in: educatorUsernames } })
    .select({ educatorUsernames: 1, topics: 1 })
    .lean();

  for (const course of courses) {
    const topicGrades = (Array.isArray(course.topics) ? course.topics : [])
      .map((t) => t?.grade)
      .filter((g) => g != null && String(g).trim() !== '');
    if (!topicGrades.length) continue;
    const names = Array.isArray(course.educatorUsernames) ? course.educatorUsernames : [];
    for (const name of names) {
      if (!map.has(name)) continue;
      const set = map.get(name);
      for (const g of topicGrades) set.add(String(g).trim());
    }
  }

  return map;
}

function educatorGradesFromUser(user, courseGradeSet) {
  const fromAssignments = [];
  const assignments = Array.isArray(user.educatorAssignments) ? user.educatorAssignments : [];
  for (const a of assignments) {
    if (a?.grade != null && String(a.grade).trim() !== '') {
      fromAssignments.push(String(a.grade).trim());
    }
  }
  if (user.grade && String(user.grade).trim() !== '') {
    fromAssignments.push(String(user.grade).trim());
  }
  const fromCourses = courseGradeSet ? Array.from(courseGradeSet) : [];
  return uniqueSortedGrades([...fromAssignments, ...fromCourses]);
}

/**
 * GET /api/super-admin/users
 * Staff User accounts + student portal accounts (portalAssigned only).
 * Query: role (optional), class (optional; applies to EDUCATOR / STUDENT).
 */
router.get('/users', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const roleFilter = String(req.query.role || '').trim().toUpperCase();
    const classFilter = String(req.query.class || '').trim();
    const wantsClassFilter =
      Boolean(classFilter) && (roleFilter === ROLE.EDUCATOR || roleFilter === 'STUDENT');

    const includeStaff =
      !roleFilter ||
      roleFilter === 'ALL' ||
      [ROLE.SUPER_ADMIN, ROLE.ADMIN, ROLE.COURSE_ADMIN, ROLE.EDUCATOR, ROLE.GUEST].includes(
        roleFilter
      );
    const includeStudents = !roleFilter || roleFilter === 'ALL' || roleFilter === 'STUDENT';

    const rows = [];

    if (includeStaff) {
      const staffQuery = {};
      if (
        roleFilter &&
        roleFilter !== 'ALL' &&
        roleFilter !== 'STUDENT' &&
        Object.values(ROLE).includes(roleFilter)
      ) {
        staffQuery.role = roleFilter;
      }

      const users = await User.find(staffQuery)
        .select({
          username: 1,
          role: 1,
          passwordPlain: 1,
          grade: 1,
          subject: 1,
          educatorAssignments: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ role: 1, username: 1 })
        .limit(1000)
        .lean();

      const educatorNames = users
        .filter((u) => u.role === ROLE.EDUCATOR)
        .map((u) => u.username);
      const courseGradeMap = await buildEducatorClassMap(educatorNames);

      for (const u of users) {
        let classes = [];
        if (u.role === ROLE.EDUCATOR) {
          classes = educatorGradesFromUser(u, courseGradeMap.get(u.username));
          if (wantsClassFilter && !gradesIncludeClass(classes, classFilter)) {
            continue;
          }
        }

        rows.push({
          accountKey: `staff:${u.username}`,
          accountKind: 'staff',
          username: u.username,
          role: u.role,
          roleLabel: roleLabel(u.role),
          classes,
          classLabel: u.role === ROLE.EDUCATOR ? classLabelFromGrades(classes) : '—',
          password: u.passwordPlain || '',
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
        });
      }
    }

    if (includeStudents) {
      const studentQuery = { portalAssigned: true };
      const students = await StudentData.find(studentQuery)
        .select({
          registrationNumber: 1,
          studentName: 1,
          grade: 1,
          portalPasswordDisplay: 1,
          portalAssigned: 1,
          createdAt: 1,
          updatedAt: 1,
        })
        .sort({ grade: 1, registrationNumber: 1 })
        .limit(5000)
        .lean();

      for (const s of students) {
        const gradeRaw = s.grade != null ? String(s.grade).trim() : '';
        const classes = gradeRaw ? uniqueSortedGrades([gradeRaw]) : [];
        if (wantsClassFilter && !gradesIncludeClass(classes, classFilter)) {
          continue;
        }

        rows.push({
          accountKey: `student:${s.registrationNumber}`,
          accountKind: 'student',
          username: s.registrationNumber,
          role: 'STUDENT',
          roleLabel: roleLabel('STUDENT'),
          classes,
          classLabel: classes.length ? classes.join(', ') : 'Not Assigned',
          password: s.portalPasswordDisplay || '',
          studentName: s.studentName || '',
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        });
      }
    }

    // Stable sort: role order then username
    const roleOrder = {
      SUPER_ADMIN: 0,
      ADMIN: 1,
      COURSE_ADMIN: 2,
      EDUCATOR: 3,
      GUEST: 4,
      STUDENT: 5,
    };
    rows.sort((a, b) => {
      const ra = roleOrder[a.role] ?? 50;
      const rb = roleOrder[b.role] ?? 50;
      if (ra !== rb) return ra - rb;
      return String(a.username).localeCompare(String(b.username));
    });

    res.json({
      success: true,
      count: rows.length,
      classOptions: CLASS_FILTER_OPTIONS,
      data: rows,
    });
  } catch (err) {
    console.error('Super admin list users error:', err);
    res.status(500).json({ success: false, error: 'Failed to list users', message: err.message });
  }
});

/**
 * PUT /api/super-admin/users/:username
 * Change password for a staff User or a student portal account.
 * Body: { password, superAdminPassword, accountKind?: 'staff'|'student' }
 */
router.put('/users/:username', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const targetUsername = String(req.params.username || '').trim();
    const { password, superAdminPassword, accountKind } = req.body || {};
    const kindHint = String(accountKind || '').trim().toLowerCase();

    if (!targetUsername) {
      return res.status(400).json({ success: false, error: 'Username required' });
    }
    if (!password || !String(password).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
        message: 'New password is required.',
      });
    }

    const ok = await verifySuperAdminPassword(req.user.username, superAdminPassword);
    if (!ok) {
      return res.status(403).json({
        success: false,
        error: 'Invalid password',
        message: 'Your password is incorrect.',
      });
    }

    const preferStudent = kindHint === 'student';
    const preferStaff = kindHint === 'staff';

    let staffUser = null;
    if (!preferStudent) {
      staffUser = await User.findOne({ username: targetUsername });
    }

    if (staffUser && !preferStudent) {
      await applyPasswordFields(staffUser, password);
      await staffUser.save();
      return res.json({
        success: true,
        message: `Password updated for "${targetUsername}".`,
        data: {
          username: staffUser.username,
          role: staffUser.role,
          accountKind: 'staff',
        },
      });
    }

    // Student portal credential (not stored in users collection)
    if (!preferStaff) {
      const student = await StudentData.findOne({
        registrationNumber: targetUsername,
        portalAssigned: true,
      });

      if (student) {
        if (!isValidStudentPortalPassword(String(password))) {
          return res.status(400).json({
            success: false,
            error: 'Invalid password',
            message:
              'Student portal password must be exactly 8 characters and include uppercase, lowercase, a number, and a special character.',
          });
        }
        const fields = await buildStudentPortalCredentialFields(String(password));
        student.portalPasswordHash = fields.portalPasswordHash;
        student.portalPasswordDisplay = fields.portalPasswordDisplay;
        // Keep portalAssigned / portalAssignedAt
        await student.save();
        return res.json({
          success: true,
          message: `Student portal password updated for "${targetUsername}".`,
          data: {
            username: student.registrationNumber,
            role: 'STUDENT',
            accountKind: 'student',
          },
        });
      }
    }

    return res.status(404).json({
      success: false,
      error: 'Not found',
      message: 'User not found.',
    });
  } catch (err) {
    console.error('Super admin update user error:', err);
    res.status(500).json({ success: false, error: 'Failed to update user', message: err.message });
  }
});

/**
 * PUT /api/super-admin/me/password — change own password
 */
router.put('/me/password', async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, error: 'Database not connected' });
    }

    const { currentPassword, newPassword } = req.body || {};
    const username = req.user?.username;

    if (!newPassword || !String(newPassword).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Password required',
        message: 'New password is required.',
      });
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
    res.status(500).json({
      success: false,
      error: 'Failed to update password',
      message: err.message,
    });
  }
});

export { SUPER_ADMIN_USERNAME };

export default router;
