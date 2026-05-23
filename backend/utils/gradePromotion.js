/** Canonical grade ladder and promotion helpers (mirrors frontend studentDataUtils). */

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

export function normalizeGradeForMatch(grade) {
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
}

export function gradesMatch(gradeA, gradeB) {
  return normalizeGradeForMatch(gradeA) === normalizeGradeForMatch(gradeB);
}

export function getNextGrade(grade) {
  const canon = normalizeGradeForMatch(grade);
  const idx = GRADE_SEQUENCE.indexOf(canon);
  if (idx === -1 || idx >= GRADE_SEQUENCE.length - 1) return null;
  return GRADE_SEQUENCE[idx + 1];
}

export function formatGradeLabel(canon) {
  if (!canon) return '';
  if (canon.startsWith('KG')) return canon.replace('-', ' ');
  return canon;
}

/** Roman numerals for class segment in enrollment (grade 1–10). */
const ARABIC_TO_ROMAN = {
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

/** Canonical grade → Roman class code used in enrollment (3rd hyphen segment). */
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

const ROMAN_TO_CANON = Object.fromEntries(
  Object.entries(CANON_TO_ENROLLMENT_ROMAN).map(([canon, roman]) => [
    roman.toUpperCase(),
    canon,
  ])
);

function applySegmentCase(roman, sample) {
  if (!sample || typeof sample !== 'string') return roman;
  if (sample === sample.toUpperCase()) return roman.toUpperCase();
  if (sample === sample.toLowerCase()) return roman.toLowerCase();
  return roman;
}

/** Map canonical grade to Roman class label for enrollment. */
export function canonGradeToEnrollmentRoman(canonGrade) {
  const canon = normalizeGradeForMatch(canonGrade);
  return CANON_TO_ENROLLMENT_ROMAN[canon] || null;
}

/**
 * Enrollment: year-serial-CLASS_ROMAN-suffix (4 parts, class is index 2).
 * Updates the class segment to match the given grade.
 */
export function updateEnrollmentClassInRegistration(enrollment, newCanonGrade) {
  if (enrollment == null || String(enrollment).trim() === '') return enrollment;
  const roman = canonGradeToEnrollmentRoman(newCanonGrade);
  if (!roman) return String(enrollment).trim();

  const trimmed = String(enrollment).trim();
  const parts = trimmed.split('-');
  if (parts.length < 3) return trimmed;

  const newSegment = applySegmentCase(roman, parts[2]);
  if (parts[2] === newSegment) return trimmed;

  parts[2] = newSegment;
  return parts.join('-');
}

export { ROMAN_TO_CANON, ARABIC_TO_ROMAN };
