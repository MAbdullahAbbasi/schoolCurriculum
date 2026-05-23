/** Shared helpers for Seedlings (student data) screens. */

export const gradeSortOrder = (g) => {
  const s = String(g).trim();
  if (/^KG[- ]?1$/i.test(s) || /^KG[- ]?I$/i.test(s)) return 0;
  if (/^KG[- ]?2$/i.test(s) || /^KG[- ]?II$/i.test(s)) return 1;
  if (/^KG[- ]?3$/i.test(s) || /^KG[- ]?III$/i.test(s)) return 2;
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return 100;
  return 10 + n;
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

export const GRADE_SEQUENCE = [
  'KG-1',
  'KG-2',
  'KG-3',
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
];

/** Normalize grade for comparison (KG variants, numeric). */
export const normalizeGradeForMatch = (grade) => {
  if (grade == null || grade === '') return '';
  let s = String(grade).trim();
  if (s === '') return '';
  s = s.replace(/^(grade|class)\s+/i, '').trim();
  if (s === '') return '';

  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  const compact = lower.replace(/\s/g, '').replace(/k\.g\.?/g, 'kg');

  if (/^kg[- ]?1$|^kg[- ]?i$|^k\.g\.?[- ]?1$|^k\.g\.?[- ]?i$/i.test(lower) || /^kg[-]?1$|^kg[-]?i$/.test(compact)) {
    return 'KG-1';
  }
  if (/^kg[- ]?2$|^kg\s*ii$|^kg[- ]?ii$|^k\.g\.?[- ]?2$|^k\.g\.?[- ]?ii$/i.test(lower) || /^kg[-]?2$|^kg[-]?ii$/.test(compact)) {
    return 'KG-2';
  }
  if (/^kg[- ]?3$|^kg[- ]?iii$|^k\.g\.?[- ]?3$|^k\.g\.?[- ]?iii$/i.test(lower) || /^kg[-]?3$|^kg[-]?iii$/.test(compact)) {
    return 'KG-3';
  }

  if (/^\d+$/.test(s)) {
    return String(parseInt(s, 10));
  }
  return s;
};

export const gradesMatch = (gradeA, gradeB) =>
  normalizeGradeForMatch(gradeA) === normalizeGradeForMatch(gradeB);

/** Next grade on the school ladder, or null if already at the top / unknown. */
export const getNextGrade = (grade) => {
  const canon = normalizeGradeForMatch(grade);
  const idx = GRADE_SEQUENCE.indexOf(canon);
  if (idx === -1 || idx >= GRADE_SEQUENCE.length - 1) return null;
  return GRADE_SEQUENCE[idx + 1];
};

export const formatGradeDisplay = (canon) => {
  if (!canon) return '';
  if (canon.startsWith('KG')) return canon.replace('-', ' ');
  return canon;
};

const CANON_TO_ENROLLMENT_ROMAN = {
  'KG-1': 'I',
  'KG-2': 'II',
  'KG-3': 'III',
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
};

function applyEnrollmentSegmentCase(roman, sample) {
  if (!sample) return roman;
  if (sample === sample.toUpperCase()) return roman.toUpperCase();
  if (sample === sample.toLowerCase()) return roman.toLowerCase();
  return roman;
}

/** Roman class segment for enrollment (3rd part after 2nd hyphen). */
export const canonGradeToEnrollmentRoman = (grade) => {
  const canon = normalizeGradeForMatch(grade);
  return CANON_TO_ENROLLMENT_ROMAN[canon] || null;
};

/** Update enrollment class segment (e.g. VIII → IX) when grade changes. */
export const updateEnrollmentClassInRegistration = (enrollment, newGrade) => {
  if (!enrollment || String(enrollment).trim() === '') return enrollment;
  const roman = canonGradeToEnrollmentRoman(newGrade);
  if (!roman) return String(enrollment).trim();

  const parts = String(enrollment).trim().split('-');
  if (parts.length < 3) return String(enrollment).trim();

  const newSegment = applyEnrollmentSegmentCase(roman, parts[2]);
  if (parts[2] === newSegment) return String(enrollment).trim();

  parts[2] = newSegment;
  return parts.join('-');
};
