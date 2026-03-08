import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconBack } from './ButtonIcons';
import { formatGradingSchemeForDisplay } from './reportUtils';
import logoLeft from './assets/logoleft.jpg';
import logoRight from './assets/logoright.jpg';
import './StudentReportDetail.css';

const GRADING_SCHEME_STORAGE_KEY = 'curriculum_grading_scheme';

// Subject groups: only show subjects that have courses; merge Oral/Written into one row per subject.
const MARKSHEET_SUBJECT_GROUPS = [
  { label: 'Urdu', keys: ['urdu_oral', 'urdu_written'] },
  { label: 'English', keys: ['english_oral', 'english_written'] },
  { label: "Math's", keys: ['math_oral', 'math_written'] },
  { label: 'Science', keys: ['science'] },
  { label: 'Social Studies', keys: ['social_studies'] },
  { label: 'Computer', keys: ['computer'] },
  { label: 'Tarjuma Tul Quran (T.Q)', keys: ['tarjuma_tul_quran'] },
  { label: 'Islamiat', keys: ['islamiat_oral', 'islamiat_written'] },
  { label: 'Nazra', keys: ['nazra'] },
  { label: 'Art', keys: ['art'] },
  { label: 'General Knowledge', keys: ['general_knowledge'] },
  { label: 'Physics', keys: ['physics'] },
  { label: 'Chemistry', keys: ['chemistry'] },
  { label: 'Biology', keys: ['biology'] },
];

// Map course subject (from DB) to template row key – first matching row gets the marks (we don't have Oral/Written split in data)
const SUBJECT_TO_TEMPLATE_KEY = {
  urdu: 'urdu_oral',
  english: 'english_oral',
  eng: 'english_oral',
  math: 'math_oral',
  maths: 'math_oral',
  mathematics: 'math_oral',
  "math's": 'math_oral',
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
  nazra: 'nazra',
  nazars: 'nazra',
  art: 'art',
  'a.a': 'art',
  'general knowledge': 'general_knowledge',
  physics: 'physics',
  chemistry: 'chemistry',
  biology: 'biology',
};

const getGradingSchemeFromStorage = () => {
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

const normalizeGradeForMatch = (grade) => {
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

/** Get curriculum objectives for a grade and subject (for fallback descriptions). */
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
  return objectives.filter(
    (obj) => (String(obj.subject || '').trim().toLowerCase()) === subjectLower
  );
};

const formatDateDisplay = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

const getAgeInMonths = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let months = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
  if (today.getDate() < dob.getDate()) months -= 1;
  return months >= 0 ? months : null;
};

const formatAgeFromMonths = (months) => {
  if (months == null || !Number.isFinite(months)) return '—';
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  return `${years} yrs ${remainingMonths} month`;
};

const StudentReportDetail = () => {
  const { registrationNumber } = useParams();
  const decodedRegNo = decodeURIComponent(registrationNumber || '');
  const navigate = useNavigate();
  const location = useLocation();
  const studentFromState = location.state?.student;

  const [student, setStudent] = useState(studentFromState || null);
  const [allStudents, setAllStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [latestGradingSchemeRows, setLatestGradingSchemeRows] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resolve student: from state or find in fetched students by registration number
  useEffect(() => {
    if (studentFromState && String(studentFromState.registrationNumber) === decodedRegNo) {
      setStudent(studentFromState);
    }
  }, [studentFromState, decodedRegNo]);

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedRegNo) return;
      try {
        setLoading(true);
        setError(null);

        const [coursesRes, studentsRes, gradingSchemesRes, curriculumRes] = await Promise.all([
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/students-data`),
          axios.get(`${API_URL}/api/grading-schemes`),
          axios.get(`${API_URL}/api/curriculum`).catch(() => ({ data: [] })),
        ]);

        const coursesList = coursesRes.data?.success ? coursesRes.data.data || [] : [];
        const studentsList = Array.isArray(studentsRes.data) ? studentsRes.data : [];
        const gradingSchemesList = gradingSchemesRes.data?.success ? gradingSchemesRes.data.data || [] : [];
        const curriculumList = Array.isArray(curriculumRes.data) ? curriculumRes.data : [];
        const latestScheme = gradingSchemesList[0] || null;
        const normalizedLatestSchemeRows = Array.isArray(latestScheme?.rows)
          ? latestScheme.rows.map((row) => ({
              percentage: row?.percentage ?? row?.marks ?? '',
              grade: row?.grade ?? '',
            }))
          : getGradingSchemeFromStorage();

        setCourses(coursesList);
        setAllStudents(studentsList);
        setLatestGradingSchemeRows(normalizedLatestSchemeRows);
        setCurriculumList(curriculumList);

        let currentStudent = studentFromState && String(studentFromState.registrationNumber) === decodedRegNo
          ? studentFromState
          : studentsList.find((s) => String(s.registrationNumber) === decodedRegNo) || null;
        setStudent(currentStudent);

        if (!currentStudent) {
          setLoading(false);
          return;
        }

        const normalizedStudentGrade = normalizeGradeForMatch(currentStudent.grade);
        if (!normalizedStudentGrade) {
          setLoading(false);
          return;
        }

        const enrolledCodes = coursesList
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
          .map((c) => c.code)
          .filter(Boolean);

        const byCourse = {};
        await Promise.all(
          enrolledCodes.map(async (code) => {
            try {
              const res = await axios.get(
                `${API_URL}/api/records/course/${encodeURIComponent(code)}`
              );
              if (res.data?.success && res.data.data) {
                byCourse[code] = res.data.data;
              }
            } catch (e) {
              // no record for this course is ok
            }
          })
        );
        setRecordsByCourse(byCourse);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [decodedRegNo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enrolled courses: course has topics with grades that include this student's grade (normalize KG-II / KG-2 etc.)
  const enrolledCoursesWithMarks = useMemo(() => {
    const normalizedStudentGrade = normalizeGradeForMatch(student?.grade);
    if (!normalizedStudentGrade || !Array.isArray(courses)) return [];

    return courses
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
        const record = recordsByCourse[course.code] || null;
        const studentEntry = record?.students?.find(
          (s) => String(s.registrationNumber) === decodedRegNo
        );
        const objectiveMarks = studentEntry?.objectiveMarks || {};
        return { course, record, objectiveMarks };
      });
  }, [courses, recordsByCourse, student, decodedRegNo]);

  // Aggregate marks by template row key (course subject -> first matching template row; 100% per course)
  const marksByTemplateKey = useMemo(() => {
    const byKey = {};
    enrolledCoursesWithMarks.forEach(({ course, record }) => {
      const rawSubject = (course.subject && String(course.subject).trim()) || '';
      const normalized = rawSubject.toLowerCase().trim();
      const templateKey = SUBJECT_TO_TEMPLATE_KEY[normalized] || null;
      if (!templateKey) return;
      const studentEntry = record?.students?.find((s) => String(s.registrationNumber) === decodedRegNo);
      const overallPercentage = studentEntry?.overallPercentage;
      const percentage = overallPercentage != null && Number.isFinite(Number(overallPercentage)) ? Number(overallPercentage) : null;
      if (!byKey[templateKey]) {
        byKey[templateKey] = { maxTotal: 0, obtainedTotal: 0 };
      }
      byKey[templateKey].maxTotal += 100;
      byKey[templateKey].obtainedTotal += percentage != null ? percentage : 0;
    });
    Object.keys(byKey).forEach((k) => {
      const row = byKey[k];
      row.percentage = row.maxTotal > 0 ? (row.obtainedTotal / row.maxTotal) * 100 : 0;
    });
    return byKey;
  }, [enrolledCoursesWithMarks, decodedRegNo]);

  const byKeyByStudent = useMemo(() => {
    const out = {};
    const currentStudentGrade = normalizeGradeForMatch(student?.grade);
    if (!currentStudentGrade) return out;

    const gradeByRegistration = new Map(
      (allStudents || []).map((s) => [String(s.registrationNumber), normalizeGradeForMatch(s.grade)])
    );

    enrolledCoursesWithMarks.forEach(({ course, record }) => {
      const rawSubject = (course.subject && String(course.subject).trim()) || '';
      const normalized = rawSubject.toLowerCase().trim();
      const templateKey = SUBJECT_TO_TEMPLATE_KEY[normalized] || null;
      if (!templateKey || !record?.students?.length) return;

      record.students.forEach((studentEntry) => {
        const registrationNumber = String(studentEntry.registrationNumber || '');
        if (!registrationNumber) return;
        if (gradeByRegistration.get(registrationNumber) !== currentStudentGrade) return;

        const overallPercentage = studentEntry?.overallPercentage;
        const percentage = overallPercentage != null && Number.isFinite(Number(overallPercentage))
          ? Number(overallPercentage)
          : null;
        if (percentage == null) return;

        if (!out[templateKey]) out[templateKey] = {};
        if (!out[templateKey][registrationNumber]) {
          out[templateKey][registrationNumber] = { maxTotal: 0, obtainedTotal: 0 };
        }
        out[templateKey][registrationNumber].maxTotal += 100;
        out[templateKey][registrationNumber].obtainedTotal += percentage;
      });
    });
    return out;
  }, [allStudents, enrolledCoursesWithMarks, student]);

  // Consolidated marksheet rows: only subjects with courses; Oral/Written merged into one row per subject.
  const marksheetDisplayRows = useMemo(() => {
    const scheme = latestGradingSchemeRows;
    const getGrade = (percentage) => {
      if (!scheme || scheme.length === 0) return '—';
      const num = Number(percentage);
      if (!Number.isFinite(num)) return '—';
      const sorted = [...scheme]
        .filter((r) => r.percentage !== undefined && r.percentage !== null && String(r.percentage).trim() !== '')
        .map((r) => ({ ...r, percentageNum: Number(r.percentage) }))
        .filter((r) => Number.isFinite(r.percentageNum))
        .sort((a, b) => b.percentageNum - a.percentageNum);
      const row = sorted.find((r) => r.percentageNum <= num);
      return row && row.grade != null ? String(row.grade) : '—';
    };

    const rows = [];
    MARKSHEET_SUBJECT_GROUPS.forEach((group) => {
      let groupMaxTotal = 0;
      let groupObtainedTotal = 0;
      group.keys.forEach((templateKey) => {
        const data = marksByTemplateKey[templateKey];
        if (data && data.maxTotal > 0) {
          groupMaxTotal += data.maxTotal;
          groupObtainedTotal += data.obtainedTotal;
        }
      });
      if (groupMaxTotal === 0) return;

      const groupPercentage = groupMaxTotal > 0 ? (groupObtainedTotal / groupMaxTotal) * 100 : 0;
      const allRegNos = new Set();
      group.keys.forEach((templateKey) => {
        if (byKeyByStudent[templateKey]) {
          Object.keys(byKeyByStudent[templateKey]).forEach((reg) => allRegNos.add(reg));
        }
      });
      let groupHighestInClass = 0;
      allRegNos.forEach((reg) => {
        let studentTotal = 0;
        group.keys.forEach((templateKey) => {
          const studentData = byKeyByStudent[templateKey]?.[reg];
          if (studentData) studentTotal += Number(studentData.obtainedTotal) || 0;
        });
        if (studentTotal > groupHighestInClass) groupHighestInClass = studentTotal;
      });

      rows.push({
        key: group.keys[0],
        label: group.label,
        maxTotal: groupMaxTotal,
        obtainedTotal: Number(groupObtainedTotal).toFixed(2),
        grade: getGrade(groupPercentage),
        highestInClass: groupHighestInClass > 0 ? Number(groupHighestInClass).toFixed(2) : '',
      });
    });
    return rows;
  }, [marksByTemplateKey, byKeyByStudent, latestGradingSchemeRows]);

  const classPosition = useMemo(() => {
    const currentStudentGrade = normalizeGradeForMatch(student?.grade);
    if (!currentStudentGrade) return null;

    const gradeByRegistration = new Map(
      (allStudents || []).map((s) => [String(s.registrationNumber), normalizeGradeForMatch(s.grade)])
    );

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

    const currentTotal = totalByStudent[decodedRegNo] || 0;
    return currentTotal > 0
      ? Object.values(totalByStudent).filter((value) => Number(value) > currentTotal).length + 1
      : null;
  }, [allStudents, enrolledCoursesWithMarks, student, decodedRegNo]);

  const getGradeFromPercentage = (percentage) => {
    const scheme = latestGradingSchemeRows;
    if (!scheme || scheme.length === 0) return '—';
    const num = Number(percentage);
    if (!Number.isFinite(num)) return '—';
    const sorted = [...scheme]
      .filter((r) => r.percentage !== undefined && r.percentage !== null && String(r.percentage).trim() !== '')
      .map((r) => ({ ...r, percentageNum: Number(r.percentage) }))
      .filter((r) => Number.isFinite(r.percentageNum))
      .sort((a, b) => b.percentageNum - a.percentageNum);
    const row = sorted.find((r) => r.percentageNum <= num);
    return row && row.grade != null ? String(row.grade) : '—';
  };

  const handleBack = () => {
    navigate('/reports');
  };

  if (loading) {
    return (
      <div className="student-report-detail-container">
        <CurriculumHeader />
        <div className="student-report-detail-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-report-detail-container">
        <CurriculumHeader />
        <div className="student-report-detail-error">{error}</div>
        <button type="button" className="student-report-detail-back-btn" onClick={handleBack}>
          <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
        </button>
      </div>
    );
  }

  const displayName = student?.studentName || 'Student';
  const displayRegNo = decodedRegNo || '—';
  const gradingSchemeRows = latestGradingSchemeRows;
  const displayClass = student?.grade != null && String(student.grade).trim() !== '' ? String(student.grade) : '—';
  const displayFatherName = student?.fathersName && String(student.fathersName).trim() !== '' ? String(student.fathersName) : '—';
  const displayDob = formatDateDisplay(student?.dateOfBirth);
  const studentAgeMonths = getAgeInMonths(student?.dateOfBirth);
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
  const reportMonthYear = new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' });

  return (
    <div className="student-report-detail-container">
      <CurriculumHeader />
      <div className="student-report-detail-content">
        <div className="student-report-detail-header">
          <h2 className="student-report-detail-title">
            Report: {displayName} ({displayRegNo})
          </h2>
          <button type="button" className="student-report-detail-back-btn" onClick={handleBack}>
            <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
          </button>
        </div>

        <section className="student-report-cover-section">
          <div className="student-report-cover-top">
            <img src={logoLeft} alt="School logo" className="student-report-cover-logo student-report-cover-logo-left" />
            <div className="student-report-cover-title-block">
              <h2 className="student-report-cover-school-title">Sapling High School <span className="student-report-cover-registered">(Registered)</span></h2>
              <p className="student-report-cover-school-subtitle">(Boys/ Girls)</p>
              <h3 className="student-report-cover-term-title">Term Exam {reportMonthYear}</h3>
            </div>
            <img src={logoRight} alt="SHS logo" className="student-report-cover-logo student-report-cover-logo-right" />
          </div>

          <div className="student-report-cover-details-grid">
            <div className="student-report-cover-detail">
              <span className="student-report-cover-label">Name:</span>
              <span className="student-report-cover-value">{displayName}</span>
            </div>
            <div className="student-report-cover-detail">
              <span className="student-report-cover-label">Class:</span>
              <span className="student-report-cover-value">{displayClass}</span>
            </div>
            <div className="student-report-cover-detail">
              <span className="student-report-cover-label">Father&apos;s Name:</span>
              <span className="student-report-cover-value">{displayFatherName}</span>
            </div>
            <div className="student-report-cover-detail">
              <span className="student-report-cover-label">Registration #:</span>
              <span className="student-report-cover-value">{displayRegNo}</span>
            </div>
            <div className="student-report-cover-detail">
              <span className="student-report-cover-label">D.o.Birth:</span>
              <span className="student-report-cover-value">{displayDob}</span>
            </div>
            <div className="student-report-cover-detail">
              <span className="student-report-cover-label">Age:</span>
              <span className="student-report-cover-value">{formatAgeFromMonths(studentAgeMonths)}</span>
            </div>
            <div className="student-report-cover-detail student-report-cover-detail-wide">
              <span className="student-report-cover-label">Average age in class:</span>
              <span className="student-report-cover-value">{formatAgeFromMonths(averageAgeMonths)}</span>
            </div>
          </div>
        </section>

        {enrolledCoursesWithMarks.length === 0 ? (
          <p className="student-report-detail-empty">
            No courses found in which this student is enrolled.
          </p>
        ) : (
          <>
            <div className="student-report-detail-sections">
            {enrolledCoursesWithMarks.map(({ course, objectiveMarks }) => (
              <section key={course.code || course._id} className="student-report-course-section">
                <h3 className="student-report-course-heading">{course.courseName || course.code}</h3>
                <div className="student-report-table-wrapper">
                  <table className="student-report-objectives-table">
                    <thead>
                      <tr>
                        <th className="student-report-th">S. No.</th>
                        <th className="student-report-th">Objective</th>
                        <th className="student-report-th">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(course.topics || []).map((topic, topicIndex) => {
                        const marks = objectiveMarks[String(topicIndex)];
                        const obtained = marks !== undefined && marks !== null ? Number(marks) : null;
                        const totalMarks = topic.marks != null && topic.marks !== '' ? Number(topic.marks) : null;
                        const percentage =
                          totalMarks != null && totalMarks > 0 && obtained != null && Number.isFinite(obtained)
                            ? (obtained / totalMarks) * 100
                            : null;
                        const displayGrade =
                          percentage != null && Number.isFinite(percentage) ? getGradeFromPercentage(percentage) : '—';
                        const curriculumObjectives = getCurriculumObjectivesBySubject(
                          curriculumList,
                          normalizeGradeForMatch(student?.grade),
                          course.subject
                        );
                        const byIndex = curriculumObjectives[topicIndex];
                        const byCode = curriculumObjectives.find(
                          (obj) => String(obj.code || '').trim() === String(topic.courseCode || '').trim()
                        );
                        const curriculumDesc = (byIndex?.description || byCode?.description || '').trim();
                        const objectiveText =
                          curriculumDesc ||
                          (topic.description && String(topic.description).trim()) ||
                          topic.topicName ||
                          topic.courseCode ||
                          `Objective ${topicIndex + 1}`;
                        return (
                          <tr key={topicIndex}>
                            <td className="student-report-td student-report-td-num">{topicIndex + 1}</td>
                            <td className="student-report-td student-report-td-objective">
                              {objectiveText}
                            </td>
                            <td className="student-report-td student-report-td-grade">
                              {displayGrade}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
            </div>
          </>
        )}

        {/* Marksheet – after objective tables, before grading scheme */}
        <section className="student-report-marksheet-section">
          <h2 className="student-report-marksheet-school-name">SAPLING HIGH SCHOOL (Registered)</h2>
          <h3 className="student-report-marksheet-heading">Annual Examination</h3>
          <div className="student-report-marksheet-table-wrapper">
            <table className="student-report-marksheet-table">
              <thead>
                <tr>
                  <th className="student-report-marksheet-th">Subject</th>
                  <th className="student-report-marksheet-th">Max. Marks</th>
                  <th className="student-report-marksheet-th">Marks. Obtained</th>
                  <th className="student-report-marksheet-th">Grade</th>
                  <th className="student-report-marksheet-th">Highest Marks in Class</th>
                </tr>
              </thead>
              <tbody>
                {marksheetDisplayRows.map((row) => (
                  <tr key={row.key}>
                    <td className="student-report-marksheet-td">{row.label}</td>
                    <td className="student-report-marksheet-td student-report-marksheet-td-num">{row.maxTotal}</td>
                    <td className="student-report-marksheet-td student-report-marksheet-td-num">{row.obtainedTotal}</td>
                    <td className="student-report-marksheet-td">{row.grade}</td>
                    <td className="student-report-marksheet-td student-report-marksheet-td-num">{row.highestInClass}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="student-report-marksheet-total-row">
                  <td className="student-report-marksheet-td"><strong>Total</strong></td>
                  <td className="student-report-marksheet-td student-report-marksheet-td-num">
                    {marksheetDisplayRows.length > 0
                      ? marksheetDisplayRows.reduce((s, r) => s + r.maxTotal, 0)
                      : ''}
                  </td>
                  <td className="student-report-marksheet-td student-report-marksheet-td-num">
                    {marksheetDisplayRows.length > 0
                      ? marksheetDisplayRows.reduce((s, r) => s + Number(r.obtainedTotal), 0).toFixed(2)
                      : ''}
                  </td>
                  <td className="student-report-marksheet-td" colSpan={2} />
                </tr>
                <tr className="student-report-marksheet-summary-row">
                  <td className="student-report-marksheet-td" colSpan={3} />
                  <td className="student-report-marksheet-td"><strong>Percentage</strong></td>
                  <td className="student-report-marksheet-td student-report-marksheet-td-num" colSpan={2}>
                    {(() => {
                      const totalMax = marksheetDisplayRows.reduce((s, r) => s + r.maxTotal, 0);
                      const totalObtained = marksheetDisplayRows.reduce((s, r) => s + Number(r.obtainedTotal), 0);
                      return totalMax > 0 ? `${((totalObtained / totalMax) * 100).toFixed(2)}%` : '';
                    })()}
                  </td>
                </tr>
                {classPosition != null && classPosition >= 1 && classPosition <= 5 && (
                  <tr className="student-report-marksheet-summary-row">
                    <td className="student-report-marksheet-td" colSpan={3} />
                    <td className="student-report-marksheet-td"><strong>Position</strong></td>
                    <td className="student-report-marksheet-td student-report-marksheet-td-num" colSpan={2}>
                      {classPosition}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </section>

        <section className="student-report-grading-scheme-section">
          <h3 className="student-report-grading-scheme-heading">GRADING SCHEME</h3>
          {gradingSchemeRows.length === 0 ? (
            <p className="student-report-grading-scheme-empty">
              No grading scheme defined. You can define one from the Grading Scheme page in the menu.
            </p>
          ) : (
            <div className="student-report-grading-scheme-list">
              {formatGradingSchemeForDisplay(gradingSchemeRows).map((row, idx) => (
                <React.Fragment key={idx}>
                  <div className="student-report-grading-scheme-row">
                    <span className="student-report-grading-scheme-grade">{row.grade}</span>
                    <span className="student-report-grading-scheme-pct">{row.percentageLabel}</span>
                    <span className="student-report-grading-scheme-remark">{row.remark}</span>
                  </div>
                  {row.showGapAfter && <div className="student-report-grading-scheme-group-gap" aria-hidden="true" />}
                </React.Fragment>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentReportDetail;
