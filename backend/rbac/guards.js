import Course from '../models/Course.js';
import User from '../models/User.js';
import { ROLE } from './roles.js';

export const requireRoles = (allowedRoles = []) => {
  const allowed = new Set(allowedRoles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Role missing from token payload.',
      });
    }
    if (!allowed.has(role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have permission to access this resource.',
        requiredRoles: allowedRoles,
      });
    }
    return next();
  };
};

// Normalizes grade strings so KG-II / KG-2 / KG II all match.
// Returns 'KG-1' | 'KG-2' | 'KG-3' for KG variants, '8' for Grade-8 variants, otherwise returns trimmed input.
export const normalizeGradeForMatch = (grade) => {
  if (grade == null || grade === '') return '';
  let s = String(grade).trim();
  if (s === '') return '';

  // Grade/Class prefixes: "Grade 5", "Class 8", etc.
  s = s.replace(/^(grade|class)\s+/i, '').trim();
  if (!s) return '';

  // Map Grade 8 variants to "8"
  if (/^8$|^viii$/i.test(s)) return '8';

  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  const compact = lower.replace(/\s/g, '').replace(/k\.g\.?/g, 'kg');

  if (/^kg[- ]?1$|^kg[- ]?i$|^k\.g\.?[- ]?1$|^k\.g\.?[- ]?i$/i.test(lower) || /^kg[-]?1$|^kg[-]?i$/.test(compact)) return 'KG-1';
  if (/^kg[- ]?2$|^kg\s*ii$|^kg[- ]?ii$|^k\.g\.?[- ]?2$|^k\.g\.?[- ]?ii$/i.test(lower) || /^kg[-]?2$|^kg[-]?ii$/.test(compact)) return 'KG-2';
  if (/^kg[- ]?3$|^kg\s*iii$|^kg[- ]?iii$|^k\.g\.?[- ]?3$|^k\.g\.?[- ]?iii$/i.test(lower) || /^kg[-]?3$|^kg[-]?iii$/.test(compact)) return 'KG-3';

  return s;
};

export const normalizeSubjectForMatch = (subject) => {
  if (subject == null) return '';
  return String(subject).trim().toLowerCase();
};

// For educators: ensure they can access only courses assigned to them.
// For ADMIN + COURSE_ADMIN: allow all courses.
export const requireCourseAccess = async (req, res, next) => {
  const role = req.user?.role;
  const username = req.user?.username;
  const courseCodeRaw =
    req.params?.courseCode ??
    req.body?.courseCode ??
    req.query?.courseCode ??
    req.params?.code;

  const courseCode = courseCodeRaw != null ? String(courseCodeRaw).trim() : '';
  if (!courseCode) {
    return res.status(400).json({
      success: false,
      error: 'courseCode required',
      message: 'Missing course code.',
    });
  }

  // ADMIN + COURSE_ADMIN can access everything
    if (role === ROLE.ADMIN || role === ROLE.COURSE_ADMIN) {
    req.course = await Course.findOne({ code: courseCode }).lean();
    return next();
  }

  // Educator can access only assigned courses AND only when educator grade+subject match.
  if (role === ROLE.EDUCATOR) {
    if (!username) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
        message: 'Missing educator username.',
      });
    }

    const course = await Course.findOne({ code: courseCode }).lean();
    if (!course) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Course not found',
      });
    }

    const assigned = Array.isArray(course.educatorUsernames)
      ? course.educatorUsernames.includes(username)
      : false;

    if (!assigned) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not assigned to this course.',
      });
    }

    const educator = await User.findOne({ username }).lean();

    const educatorAssignments = Array.isArray(educator?.educatorAssignments)
      ? educator.educatorAssignments
      : [];

    // Backwards compatibility: allow legacy single grade+subject.
    const legacyPair =
      educator?.grade && educator?.subject
        ? [{ grade: educator.grade, subject: educator.subject }]
        : [];

    const pairs = [...educatorAssignments, ...legacyPair];
    const normalizedPairs = pairs
      .map((p) => ({
        grade: normalizeGradeForMatch(p?.grade),
        subject: normalizeSubjectForMatch(p?.subject),
      }))
      .filter((p) => p.grade && p.subject);

    if (!normalizedPairs.length) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Educator grade/subject not configured.',
      });
    }

    const courseSubjectNorm = normalizeSubjectForMatch(course.subject);

    // Grade match: at least one topic grade must match any educator grade for the matched subject.
    const topicGrades = Array.isArray(course.topics) ? course.topics : [];
    const topicGradeNorms = topicGrades.map((t) => normalizeGradeForMatch(t?.grade));

    const courseMatchesAnyPair = normalizedPairs.some((pair) => {
      if (courseSubjectNorm !== pair.subject) return false;
      return topicGradeNorms.some((g) => g === pair.grade);
    });

    if (!courseMatchesAnyPair) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You are not assigned to this course for your configured classes.',
      });
    }

    req.course = course;
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Invalid role.',
  });
};

