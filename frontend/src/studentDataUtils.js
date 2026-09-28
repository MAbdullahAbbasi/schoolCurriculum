/** Shared helpers for Seedlings (student data) screens. */

export const gradeSortOrder = (g) => {
  const canon = normalizeGradeForMatch(g);
  if (canon === 'KG-2') return 0;
  const n = parseInt(canon, 10);
  if (!Number.isNaN(n)) return 10 + n;
  return 100;
};

export const normalizeGradeForSubjectRequirement = (grade) => {
  if (grade == null || String(grade).trim() === '') return '';
  const g = String(grade).trim().replace(/^(grade|class)\s+/i, '').trim().toLowerCase();
  if (['8', '08', 'viii', 'eighth'].includes(g)) return '8';
  if (['9', '09', 'ix', 'ninth'].includes(g)) return '9';
  if (['10', 'x', 'tenth'].includes(g)) return '10';
  return '';
};

export const requiresSubjectChoice = (grade) => {
  const normalized = normalizeGradeForSubjectRequirement(grade);
  return normalized === '8' || normalized === '9' || normalized === '10';
};

export const formatDateOfBirth = (dateOfBirth) => {
  if (!dateOfBirth) return '—';
  const d = new Date(dateOfBirth);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const toDateInputValue = (dateOfBirth) => {
  if (!dateOfBirth) return '';
  const s = String(dateOfBirth);
  return s.length > 10 ? s.split('T')[0] : s;
};

export const sortStudentsByGrade = (students) =>
  [...(students || [])].sort((a, b) => {
    const g = gradeSortOrder(a.grade) - gradeSortOrder(b.grade);
    if (g !== 0) return g;
    return String(a.studentName || '').localeCompare(String(b.studentName || ''));
  });

export const gradesFromStudents = (students) => {
  const set = new Set();
  (students || []).forEach((s) => {
    if (s.grade != null && String(s.grade).trim() !== '') set.add(String(s.grade).trim());
  });
  return Array.from(set).sort((a, b) => gradeSortOrder(a) - gradeSortOrder(b));
};

/**
 * School ladder for students: K.G-II, then Class 1–12.
 * Class 10 still passes out to alumni (isClassTen); 11→12 uses getNextGrade.
 */
export const GRADE_SEQUENCE = ['KG-2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

/** Allowed grade values for student add/edit dropdowns (canonical forms). */
export const STUDENT_GRADE_OPTIONS = [...GRADE_SEQUENCE];
export const ALLOWED_STUDENT_GRADES = STUDENT_GRADE_OPTIONS;

/** Normalize grade for comparison (KG variants, numeric). */
export const normalizeGradeForMatch = (grade) => {
  if (grade == null || grade === '') return '';
  let s = String(grade).trim();
  if (s === '') return '';
  s = s.replace(/^(grade|class)\s+/i, '').trim();
  if (s === '') return '';

  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  const compact = lower.replace(/\s/g, '').replace(/k\.g\.?/g, 'kg').replace(/\./g, '');

  if (
    /^kg[- ]?1$|^kg[- ]?i$|^k\.g\.?[- ]?i$|^k\.g\.-i$/i.test(lower) ||
    /^kg[-]?1$|^kg[-]?i$/.test(compact) ||
    lower === 'kg i'
  ) {
    return 'KG-1';
  }
  if (
    /^kg[- ]?2$|^kg\s*ii$|^kg[- ]?ii$|^k\.g\.?[- ]?2$|^k\.g\.?[- ]?ii$|^k\.g\.-ii$/i.test(lower) ||
    /^kg[-]?2$|^kg[-]?ii$/.test(compact) ||
    lower === 'kg ii' ||
    lower === 'k.g-ii'
  ) {
    return 'KG-2';
  }
  if (
    /^kg[- ]?3$|^kg[- ]?iii$|^k\.g\.?[- ]?3$|^k\.g\.?[- ]?iii$|^k\.g\.-iii$/i.test(lower) ||
    /^kg[-]?3$|^kg[-]?iii$/.test(compact) ||
    lower === 'kg iii' ||
    lower === 'k.g-iii'
  ) {
    return 'KG-3';
  }

  if (/^\d+$/.test(s)) {
    return String(parseInt(s, 10));
  }
  return s;
};

export const gradesMatch = (gradeA, gradeB) =>
  normalizeGradeForMatch(gradeA) === normalizeGradeForMatch(gradeB);

/** Resolve input to a canonical allowed student grade, or null. */
export const resolveAllowedStudentGrade = (grade) => {
  if (grade == null || String(grade).trim() === '') return null;
  const raw = String(grade).trim();
  if (ALLOWED_STUDENT_GRADES.includes(raw)) return raw;
  const canon = normalizeGradeForMatch(raw);
  if (ALLOWED_STUDENT_GRADES.includes(canon)) return canon;
  return null;
};

/** Map stored grade to a dropdown value (preserves selection for existing records). */
export const gradeToSelectValue = (grade) => {
  const resolved = resolveAllowedStudentGrade(grade);
  if (resolved) return resolved;
  return grade != null && String(grade).trim() !== '' ? String(grade).trim() : '';
};

/**
 * Options for grade <select>. Includes current grade if it is a legacy value
 * outside the allowed list so edit does not wipe it before the user saves.
 */
export const getGradeSelectOptions = (currentGrade) => {
  const opts = [...STUDENT_GRADE_OPTIONS];
  const raw = currentGrade != null ? String(currentGrade).trim() : '';
  const resolved = resolveAllowedStudentGrade(raw);
  if (raw && !resolved && !opts.includes(raw)) {
    opts.push(raw);
  }
  return opts;
};

/** Optional email: empty OK; otherwise local@domain.tld with no spaces. */
export const isValidStudentEmail = (email) => {
  if (email == null || String(email).trim() === '') return true;
  const s = String(email).trim();
  if (/\s/.test(s)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
};

export const normalizeStudentEmail = (email) => {
  if (email == null || String(email).trim() === '') return '';
  return String(email).trim();
};

/** Unique canonical grades from student records (merges K.G-II, KG-2, KG II, etc.). */
export const uniqueCanonicalGradesFromStudents = (students) => {
  const seen = new Set();
  const list = [];
  (students || []).forEach((s) => {
    const canon = normalizeGradeForMatch(s.grade);
    if (!canon || seen.has(canon)) return;
    seen.add(canon);
    list.push(canon);
  });
  return list.sort((a, b) => gradeSortOrder(a) - gradeSortOrder(b));
};

export const studentMatchesGrade = (student, selectedGrade) =>
  gradesMatch(student?.grade, selectedGrade);

/** Next grade on the school ladder, or null if already at the top / unknown. */
export const getNextGrade = (grade) => {
  const canon = normalizeGradeForMatch(grade);
  const idx = GRADE_SEQUENCE.indexOf(canon);
  if (idx === -1 || idx >= GRADE_SEQUENCE.length - 1) return null;
  return GRADE_SEQUENCE[idx + 1];
};

export const isClassTen = (grade) => normalizeGradeForMatch(grade) === '10';

export const currentPassedOutYear = () => new Date().getFullYear();

export const passedOutYearOptions = (span = 12) => {
  const current = currentPassedOutYear();
  return Array.from({ length: span }, (_, i) => current - i);
};

/** Display label for a grade (K.G-II, Class 1, Class 8, …). */
export const formatGradeDisplay = (canonOrGrade) => {
  if (!canonOrGrade) return '';
  const canon = normalizeGradeForMatch(canonOrGrade) || String(canonOrGrade);
  if (canon === 'KG-2') return 'K.G-II';
  if (/^\d+$/.test(canon)) return `Class ${canon}`;
  return String(canonOrGrade);
};

/** Label for grade filter / class dropdown options. */
export const formatGradeOptionLabel = (grade) => {
  const display = formatGradeDisplay(grade);
  if (normalizeGradeForMatch(grade) === 'KG-2') return `Grade ${display}`;
  return display;
};

const CANON_TO_ENROLLMENT_CLASS = {
  'KG-1': 'KG I',
  'KG-2': 'KG II',
  'KG-3': 'KG III',
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
};

export const splitEnrollment = (enrollment) => {
  if (!enrollment || String(enrollment).trim() === '') return null;
  const parts = String(enrollment).trim().split('-');
  if (parts.length < 3) return null;

  if (parts.length >= 4 && /^kg$/i.test(parts[2].trim())) {
    return {
      prefix: [parts[0], parts[1]],
      classSegment: `${parts[2]} ${parts[3]}`.trim(),
      suffix: parts.slice(4).join('-'),
    };
  }

  return {
    prefix: [parts[0], parts[1]],
    classSegment: parts[2],
    suffix: parts.slice(3).join('-'),
  };
};

export const joinEnrollment = ({ prefix, classSegment, suffix }) => {
  const head = `${prefix[0]}-${prefix[1]}-${classSegment}`;
  return suffix ? `${head}-${suffix}` : head;
};

/** Class segment for enrollment (3rd part, e.g. KG II or VIII). */
export const canonGradeToEnrollmentClassSegment = (grade) => {
  const canon = normalizeGradeForMatch(grade);
  return CANON_TO_ENROLLMENT_CLASS[canon] || null;
};

export const canonGradeToEnrollmentRoman = canonGradeToEnrollmentClassSegment;

/** Update enrollment class segment (e.g. KG II → I when promoted to class 1). */
export const updateEnrollmentClassInRegistration = (enrollment, newGrade) => {
  const parsed = splitEnrollment(enrollment);
  if (!parsed) return String(enrollment).trim();

  const newClass = canonGradeToEnrollmentClassSegment(newGrade);
  if (!newClass) return String(enrollment).trim();
  if (parsed.classSegment === newClass) return String(enrollment).trim();

  parsed.classSegment = newClass;
  return joinEnrollment(parsed);
};
