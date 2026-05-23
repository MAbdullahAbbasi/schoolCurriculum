/** Canonical grade ladder and promotion helpers (mirrors frontend studentDataUtils). */

/** School ladder: only K.G-II, then Class 1–10 (no KG-1 / KG-3). */
export const GRADE_SEQUENCE = ['KG-2', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

export function normalizeGradeForMatch(grade) {
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
  const normalized = normalizeGradeForMatch(canon) || canon;
  if (normalized === 'KG-2') return 'K.G-II';
  if (/^\d+$/.test(normalized)) return `Class ${normalized}`;
  return String(canon);
}

/** Canonical grade → 3rd enrollment segment (e.g. KG II, VIII, I). */
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
};

/**
 * Parse enrollment: year-serial-CLASS-suffix
 * CLASS may be "KG II" (one segment) or split as KG + II when stored as KG-II.
 */
export function splitEnrollment(enrollment) {
  if (enrollment == null || String(enrollment).trim() === '') return null;
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
}

export function joinEnrollment({ prefix, classSegment, suffix }) {
  const head = `${prefix[0]}-${prefix[1]}-${classSegment}`;
  return suffix ? `${head}-${suffix}` : head;
}

/** Map canonical grade to class segment used in enrollment. */
export function canonGradeToEnrollmentClassSegment(canonGrade) {
  const canon = normalizeGradeForMatch(canonGrade);
  return CANON_TO_ENROLLMENT_CLASS[canon] || null;
}

/** @deprecated alias */
export function canonGradeToEnrollmentRoman(canonGrade) {
  return canonGradeToEnrollmentClassSegment(canonGrade);
}

/**
 * Updates the class segment in enrollment when grade changes (e.g. KG II → I on KG-2 → class 1).
 */
export function updateEnrollmentClassInRegistration(enrollment, newCanonGrade) {
  const parsed = splitEnrollment(enrollment);
  if (!parsed) return String(enrollment).trim();

  const newClass = canonGradeToEnrollmentClassSegment(newCanonGrade);
  if (!newClass) return String(enrollment).trim();
  if (parsed.classSegment === newClass) return String(enrollment).trim();

  parsed.classSegment = newClass;
  return joinEnrollment(parsed);
}
