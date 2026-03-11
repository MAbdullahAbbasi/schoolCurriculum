export const GRADING_SCHEME_STORAGE_KEY = 'curriculum_grading_scheme';

export const MARKSHEET_TEMPLATE_ROWS = [
  { label: 'Urdu (Oral)', key: 'urdu_oral' },
  { label: 'Urdu (Written)', key: 'urdu_written' },
  { label: 'English (Oral)', key: 'english_oral' },
  { label: 'English (Written)', key: 'english_written' },
  { label: "Math's (Oral)", key: 'math_oral' },
  { label: "Math's (Written)", key: 'math_written' },
  { label: 'Science', key: 'science' },
  { label: 'Social Studies', key: 'social_studies' },
  { label: 'Computer', key: 'computer' },
  { label: 'Tarjuma Tul Quran (T.Q)', key: 'tarjuma_tul_quran' },
  { label: 'Islamiat (Oral)', key: 'islamiat_oral' },
  { label: 'Islamiat (Written)', key: 'islamiat_written' },
  { label: 'Nazra', key: 'nazra' },
  { label: 'Art', key: 'art' },
  { label: 'General Knowledge', key: 'general_knowledge' },
  { label: 'Physics', key: 'physics' },
  { label: 'Chemistry', key: 'chemistry' },
  { label: 'Biology', key: 'biology' },
];

// Map course subject to template key. Include variants (e.g. "Urdu Oral") so every course matches and report card matches result sheet.
export const SUBJECT_TO_TEMPLATE_KEY = {
  urdu: 'urdu_oral',
  'urdu oral': 'urdu_oral',
  'urdu written': 'urdu_written',
  english: 'english_oral',
  eng: 'english_oral',
  'english oral': 'english_oral',
  'english written': 'english_written',
  math: 'math_oral',
  maths: 'math_oral',
  mathematics: 'math_oral',
  "math's": 'math_oral',
  'math oral': 'math_oral',
  'math written': 'math_written',
  'maths oral': 'math_oral',
  'maths written': 'math_written',
  "math's oral": 'math_oral',
  "math's written": 'math_written',
  science: 'science',
  sci: 'science',
  'social studies': 'social_studies',
  's.st': 'social_studies',
  computer: 'computer',
  comp: 'computer',
  'tarjuma tul quran': 'tarjuma_tul_quran',
  't.q': 'tarjuma_tul_quran',
  tq: 'tarjuma_tul_quran',
  islamiat: 'islamiat_oral',
  'islamiat oral': 'islamiat_oral',
  'islamiat written': 'islamiat_written',
  nazra: 'nazra',
  nazars: 'nazra',
  art: 'art',
  'a.a': 'art',
  'general knowledge': 'general_knowledge',
  'g.k': 'general_knowledge',
  'g.k.': 'general_knowledge',
  gk: 'general_knowledge',
  physics: 'physics',
  chemistry: 'chemistry',
  biology: 'biology',
};

// Display order for subjects: Urdu, English, Mathematics, T.Q/Nazra/Islamiat, Science, Social Studies, General Knowledge, Physics, Chemistry, Biology/Computer, Art
export const SUBJECT_DISPLAY_ORDER = [
  'urdu_oral',
  'english_oral',
  'math_oral',
  'tarjuma_tul_quran',
  'nazra',
  'islamiat_oral',
  'science',
  'social_studies',
  'general_knowledge',
  'physics',
  'chemistry',
  'biology',
  'computer',
  'art',
];

// Subject groups: merge Oral/Written into one row per subject; only rows with data are shown. Order matches SUBJECT_DISPLAY_ORDER.
export const MARKSHEET_SUBJECT_GROUPS = [
  { label: 'Urdu', keys: ['urdu_oral', 'urdu_written'] },
  { label: 'English', keys: ['english_oral', 'english_written'] },
  { label: "Mathematics", keys: ['math_oral', 'math_written'] },
  { label: 'Tarjuma Tul Quran (T.Q)', keys: ['tarjuma_tul_quran'] },
  { label: 'Nazra', keys: ['nazra'] },
  { label: 'Islamiat', keys: ['islamiat_oral', 'islamiat_written'] },
  { label: 'Science', keys: ['science'] },
  { label: 'Social Studies', keys: ['social_studies'] },
  { label: 'General Knowledge', keys: ['general_knowledge'] },
  { label: 'Physics', keys: ['physics'] },
  { label: 'Chemistry', keys: ['chemistry'] },
  { label: 'Biology', keys: ['biology'] },
  { label: 'Computer', keys: ['computer'] },
  { label: 'Art', keys: ['art'] },
];

export const getCourseTotalMarks = (course) => {
  if (!course) return 0;
  const qpm = course.questionPartMarks || [];
  if (qpm.length > 0) return qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
  const topics = course.topics || [];
  return topics.reduce((s, t) => s + (Number(t.marks) || 0), 0);
};

// Same order as result sheet so report card shows same subjects in same order
export const getSubjectSortIndex = (subjectName) => {
  if (!subjectName || typeof subjectName !== 'string') return 999;
  const n = subjectName.toLowerCase().trim().replace(/\s+/g, ' ');
  if (n.startsWith('urdu')) return 0;
  if (n.startsWith('eng')) return 1;
  if (/\bmath|maths\b/.test(n) || n === 'mathematics') return 2;
  if (n.startsWith('sci') || n === 'science') return 3;
  if (n.includes('social') || n === 's.st' || n === 's.st.') return 4;
  if (n.startsWith('comp') || n === 'computer') return 5;
  if (n.includes('tarjuma') || n.includes('t.q') || n === 'tq') return 6;
  if (n.includes('islamiat') || n.startsWith('isl') || n.startsWith('del')) return 7;
  if (n.startsWith('nazar') || n === 'nazra') return 8;
  if (n.startsWith('art') || n === 'a.a' || n === 'a.a.') return 9;
  if (n === 'g.k' || n === 'g.k.' || n === 'gk' || n.includes('general knowledge')) return 10;
  if (n.startsWith('phys') || n === 'physics') return 11;
  if (n.startsWith('chem') || n === 'chemistry') return 12;
  if (n.startsWith('bio') || n === 'biology') return 13;
  return 999;
};

export const normalizeGradeForMatch = (grade) => {
  if (grade == null || grade === '') return '';
  let s = String(grade).trim();
  if (s === '') return '';
  s = s.replace(/^(grade|class)\s+/i, '').trim();
  if (s === '') return '';
  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  const compact = lower.replace(/\s/g, '').replace(/k\.g\.?/g, 'kg');
  if (/^kg[- ]?1$|^kg[- ]?i$|^k\.g\.?[- ]?1$|^k\.g\.?[- ]?i$/i.test(lower) || /^kg[-]?1$|^kg[-]?i$/.test(compact)) return 'KG-1';
  if (/^kg[- ]?2$|^kg\s*ii$|^kg[- ]?ii$|^k\.g\.?[- ]?2$|^k\.g\.?[- ]?ii$/i.test(lower) || /^kg[-]?2$|^kg[-]?ii$/.test(compact)) return 'KG-2';
  if (/^kg[- ]?3$|^kg[- ]?iii$|^k\.g\.?[- ]?3$|^k\.g\.?[- ]?iii$/i.test(lower) || /^kg[-]?3$|^kg[-]?iii$/.test(compact)) return 'KG-3';
  return s;
};

export const getGradingSchemeFromStorage = () => {
  try {
    const raw = localStorage.getItem(GRADING_SCHEME_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((row) => ({
          percentage: row?.percentage ?? row?.marks ?? '',
          grade: row?.grade ?? '',
        }))
      : [];
  } catch {
    return [];
  }
};

export const formatDateDisplay = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export const getAgeInMonths = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let months = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
  if (today.getDate() < dob.getDate()) months -= 1;
  return months >= 0 ? months : null;
};

export const formatAgeFromMonths = (months) => {
  if (months == null || !Number.isFinite(months)) return '—';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years} yrs ${remainingMonths} month`;
};

export const normalizeGradingSchemeRows = (rows) =>
  Array.isArray(rows)
    ? rows.map((row) => ({
        percentage: row?.percentage ?? row?.marks ?? '',
        grade: row?.grade ?? '',
      }))
    : [];

// Default remarks for report grading scheme display (Grade -> Remark)
export const GRADE_REMARKS = {
  'A++': 'Fantastic',
  'A+': 'Brilliant',
  'A': 'Well Done',
  'B+': 'Good achievement',
  'B': 'Has room to improve',
  'C': 'Try to improve',
  'D': 'Needs to work hard',
  'U': 'Must work hard',
};

// Group 1: A++, A+, A; Group 2: B+, B; Group 3: C, D, U (for visual spacing on report)
const GRADING_SCHEME_GROUP = {
  'A++': 1, 'A+': 1, 'A': 1,
  'B+': 2, 'B': 2,
  'C': 3, 'D': 3, 'U': 3,
};

/** Sort by percentage descending and format for display: Grade | X% and above / Less than X | Remark. Adds group (1,2,3) and showGapAfter for layout. */
export const formatGradingSchemeForDisplay = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const normalized = rows
    .map((r) => ({
      percentage: r?.percentage ?? r?.marks ?? '',
      grade: String(r?.grade ?? '').trim(),
    }))
    .filter((r) => r.percentage !== '' && r.grade !== '');
  const sorted = [...normalized].sort((a, b) => {
    const numA = Number(a.percentage);
    const numB = Number(b.percentage);
    if (!Number.isFinite(numA) && !Number.isFinite(numB)) return 0;
    if (!Number.isFinite(numA)) return 1;
    if (!Number.isFinite(numB)) return -1;
    return numB - numA; // descending
  });
  return sorted.map((row, idx) => {
    const pctNum = Number(String(row.percentage).replace(/%/g, ''));
    const isLast = idx === sorted.length - 1;
    const pctDisplay = Number.isFinite(pctNum) ? pctNum : row.percentage;
    const percentageLabel = isLast
      ? (String(row.grade).trim().toUpperCase() === 'U' ? 'Less than 40' : `Less than ${pctDisplay}`)
      : `${pctDisplay}% and above`;
    const remark = GRADE_REMARKS[row.grade] ?? '';
    const group = GRADING_SCHEME_GROUP[row.grade] ?? 3;
    const nextGroup = sorted[idx + 1] ? (GRADING_SCHEME_GROUP[String(sorted[idx + 1].grade).trim()] ?? 3) : null;
    const showGapAfter = nextGroup != null && group !== nextGroup;
    return { grade: row.grade, percentageLabel, remark, group, showGapAfter };
  });
};

export const getGradeFromPercentageWithScheme = (percentage, schemeRows) => {
  if (!schemeRows || schemeRows.length === 0) return '—';
  const num = Number(percentage);
  if (!Number.isFinite(num)) return '—';
  const sorted = [...schemeRows]
    .filter((r) => r.percentage !== undefined && r.percentage !== null && String(r.percentage).trim() !== '')
    .map((r) => ({ ...r, percentageNum: Number(r.percentage) }))
    .filter((r) => Number.isFinite(r.percentageNum))
    .sort((a, b) => b.percentageNum - a.percentageNum);
  const row = sorted.find((r) => r.percentageNum <= num);
  return row && row.grade != null ? String(row.grade) : '—';
};

const SUBJECT_MATCH_ALIASES = {
  maths: ['maths', 'math', 'mathematics'],
  math: ['maths', 'math', 'mathematics'],
  mathematics: ['maths', 'math', 'mathematics'],
  sci: ['sci', 'science'],
  science: ['sci', 'science'],
  'social studies': ['social studies', 's.st', 's.st.'],
  's.st': ['social studies', 's.st', 's.st.'],
  computer: ['computer', 'comp'],
  comp: ['computer', 'comp'],
  nazra: ['nazra', 'nazars'],
  nazars: ['nazra', 'nazars'],
};

const subjectMatches = (courseSubjectLower, objectiveSubjectLower) => {
  if (courseSubjectLower === objectiveSubjectLower) return true;
  const aliases = SUBJECT_MATCH_ALIASES[courseSubjectLower];
  return aliases ? aliases.includes(objectiveSubjectLower) : false;
};

const getCurriculumObjectivesBySubject = (curriculumList, studentGradeNormalized, courseSubject) => {
  if (!Array.isArray(curriculumList) || !courseSubject) return [];
  const subjectLower = String(courseSubject).trim().toLowerCase();
  const doc = curriculumList.find((d) => {
    const g = d.grade;
    const id = d.id;
    if (studentGradeNormalized === 'KG-1' || studentGradeNormalized === 'KG-2' || studentGradeNormalized === 'KG-3') {
      return String(g).trim() === studentGradeNormalized;
    }
    const num = parseInt(studentGradeNormalized, 10);
    if (!Number.isNaN(num)) return g === num || String(g) === studentGradeNormalized || id === num;
    return String(g).trim() === studentGradeNormalized;
  });
  const objectives = doc?.objectives || [];
  return objectives.filter((obj) => {
    const objSubject = String(obj.subject || '').trim().toLowerCase();
    return subjectMatches(subjectLower, objSubject);
  });
};

export const buildStudentReportData = ({
  student,
  allStudents,
  courses,
  recordsByCourse,
  gradingSchemeRows,
  registrationNumber,
  curriculumList = [],
}) => {
  const decodedRegNo = String(registrationNumber || student?.registrationNumber || '');
  const latestGradingSchemeRows = normalizeGradingSchemeRows(gradingSchemeRows);
  const effectiveSchemeRows = latestGradingSchemeRows.length > 0 ? latestGradingSchemeRows : getGradingSchemeFromStorage();

  const normalizedStudentGrade = normalizeGradeForMatch(student?.grade);
  let enrolledCoursesWithMarks = (!normalizedStudentGrade || !Array.isArray(courses))
    ? []
    : courses
        .filter((course) => {
          const topics = course.topics || [];
          const courseGrades = new Set();
          topics.forEach((t) => {
            if (t.grade != null && t.grade !== '') {
              courseGrades.add(normalizeGradeForMatch(t.grade));
            }
          });
          if (courseGrades.size === 0) return true;
          return courseGrades.has(normalizedStudentGrade);
        })
        .map((course) => {
          const record = recordsByCourse?.[course.code] || null;
          const studentEntry = record?.students?.find(
            (s) => String(s.registrationNumber) === decodedRegNo
          );
          const objectiveMarks = studentEntry?.objectiveMarks || {};
          return { course, record, objectiveMarks };
        });

  enrolledCoursesWithMarks = [...enrolledCoursesWithMarks].sort((a, b) => {
    const labelA = (a.course.subject && String(a.course.subject).trim()) || a.course.courseName || a.course.code || '';
    const labelB = (b.course.subject && String(b.course.subject).trim()) || b.course.courseName || b.course.code || '';
    return getSubjectSortIndex(labelA) - getSubjectSortIndex(labelB);
  });

  const currentStudentGrade = normalizeGradeForMatch(student?.grade);
  const gradeByRegistration = new Map(
    (allStudents || []).map((s) => [String(s.registrationNumber), normalizeGradeForMatch(s.grade)])
  );

  // Build marksheet from same course list as result sheet: one row per course, same formula
  const marksheetRows = enrolledCoursesWithMarks
    .map(({ course, record, objectiveMarks }) => {
      const courseTotal = getCourseTotalMarks(course);
      if (courseTotal <= 0) return null;
      const studentEntry = record?.students?.find((s) => String(s.registrationNumber) === decodedRegNo);
      if (!studentEntry) return null; // not enrolled in this course (e.g. Bio/Comp choice) — do not show or count
      const pct = studentEntry.overallPercentage != null && Number.isFinite(Number(studentEntry.overallPercentage))
        ? Number(studentEntry.overallPercentage)
        : null;
      const obtainedMarks = pct != null ? Math.round((pct / 100) * courseTotal * 100) / 100 : 0;
      const percentage = pct != null ? (obtainedMarks / courseTotal) * 100 : 0;
      let highestInClass = 0;
      if (record?.students?.length) {
        record.students.forEach((se) => {
          if (gradeByRegistration.get(String(se.registrationNumber)) !== currentStudentGrade) return;
          const pc = se.overallPercentage != null && Number.isFinite(Number(se.overallPercentage)) ? Number(se.overallPercentage) : null;
          if (pc == null) return;
          const m = Math.round((pc / 100) * courseTotal * 100) / 100;
          if (m > highestInClass) highestInClass = m;
        });
      }
      const label = (course.subject && String(course.subject).trim()) || course.courseName || course.code || '—';
      return {
        key: course.code,
        label,
        maxTotal: courseTotal,
        obtainedTotal: Number(obtainedMarks).toFixed(2),
        grade: getGradeFromPercentageWithScheme(percentage, effectiveSchemeRows),
        highestInClass: highestInClass > 0 ? Number(highestInClass).toFixed(2) : null,
      };
    })
    .filter(Boolean);
  marksheetRows.sort((a, b) => getSubjectSortIndex(a.label) - getSubjectSortIndex(b.label));

  const totalMax = marksheetRows.reduce((s, r) => s + r.maxTotal, 0);
  const totalObtained = marksheetRows.reduce((s, r) => s + Number(r.obtainedTotal), 0);
  const totalPercentage = totalMax > 0 ? `${((totalObtained / totalMax) * 100).toFixed(2)}%` : '';

  const totalByStudent = {};
  enrolledCoursesWithMarks.forEach(({ record }) => {
    if (!record?.students?.length) return;
    record.students.forEach((studentEntry) => {
      const reg = String(studentEntry.registrationNumber || '');
      if (!reg) return;
      if (gradeByRegistration.get(reg) !== currentStudentGrade) return;
      const overallPercentage = studentEntry?.overallPercentage;
      const percentage = overallPercentage != null && Number.isFinite(Number(overallPercentage))
        ? Number(overallPercentage)
        : null;
      if (percentage == null) return;
      totalByStudent[reg] = (totalByStudent[reg] || 0) + percentage;
    });
  });
  const currentStudentTotal = totalByStudent[decodedRegNo] || 0;
  const position = currentStudentTotal > 0
    ? Object.values(totalByStudent).filter((value) => Number(value) > currentStudentTotal).length + 1
    : null;
  // Only show position on report card when it is 1–5; otherwise leave blank.
  const classPosition = position != null && position >= 1 && position <= 5 ? position : null;

  const objectiveSections = enrolledCoursesWithMarks.map(({ course, objectiveMarks }) => {
    const curriculumObjectives = getCurriculumObjectivesBySubject(
      curriculumList,
      normalizedStudentGrade,
      course.subject
    );
    return {
      title: course.courseName || course.code,
      rows: (course.topics || []).map((topic, topicIndex) => {
        const marks = objectiveMarks[String(topicIndex)];
        const obtained = marks !== undefined && marks !== null ? Number(marks) : null;
        const totalMarks = topic.marks != null && topic.marks !== '' ? Number(topic.marks) : null;
        const percentage =
          totalMarks != null && totalMarks > 0 && obtained != null && Number.isFinite(obtained)
            ? (obtained / totalMarks) * 100
            : null;
        const grade =
          percentage != null && Number.isFinite(percentage)
            ? getGradeFromPercentageWithScheme(percentage, effectiveSchemeRows)
            : '—';
        const byIndex = curriculumObjectives[topicIndex];
        const byCode = curriculumObjectives.find(
          (obj) => String(obj.code || '').trim() === String(topic.courseCode || '').trim()
        );
        const curriculumDesc = (byIndex?.description || byCode?.description || '').trim();
        const objective =
          curriculumDesc ||
          topic.topicName ||
          (topic.description && String(topic.description).trim()) ||
          topic.courseCode ||
          `Objective ${topicIndex + 1}`;
        return {
          objective,
          percentage: percentage != null ? `${Number(percentage).toFixed(2)}%` : '—',
          grade,
        };
      }),
    };
  });

  const classmatesWithDob = (allStudents || []).filter(
    (s) =>
      normalizeGradeForMatch(s.grade) === normalizeGradeForMatch(student?.grade) &&
      getAgeInMonths(s.dateOfBirth) != null
  );
  const averageAgeMonths = classmatesWithDob.length > 0
    ? Math.round(
        classmatesWithDob.reduce((sum, s) => sum + getAgeInMonths(s.dateOfBirth), 0) / classmatesWithDob.length
      )
    : null;

  return {
    displayName: student?.studentName || 'Student',
    displayRegNo: decodedRegNo || '—',
    displayClass: student?.grade != null && String(student.grade).trim() !== '' ? String(student.grade) : '—',
    displayFatherName: student?.fathersName && String(student.fathersName).trim() !== '' ? String(student.fathersName) : '—',
    displayDob: formatDateDisplay(student?.dateOfBirth),
    studentAge: formatAgeFromMonths(getAgeInMonths(student?.dateOfBirth)),
    averageAgeInClass: formatAgeFromMonths(averageAgeMonths),
    reportMonthYear: new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
    objectiveSections,
    marksheetRows,
    totalMax: totalMax > 0 ? totalMax : '',
    totalObtained: totalMax > 0 ? Number(totalObtained).toFixed(2) : '',
    totalPercentage,
    classPosition,
    gradingSchemeRows: effectiveSchemeRows,
  };
};
