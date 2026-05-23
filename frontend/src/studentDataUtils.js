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
