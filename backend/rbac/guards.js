import Course from '../models/Course.js';
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

  // Educator can access only assigned courses
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

    req.course = course;
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Invalid role.',
  });
};

