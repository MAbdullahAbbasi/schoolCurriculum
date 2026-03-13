import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconBack } from './ButtonIcons';
import './ResultSheet.css';

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

const getCourseTotalMarks = (course) => {
  if (!course) return 0;
  const qpm = course.questionPartMarks || [];
  if (qpm.length > 0) return qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
  const topics = course.topics || [];
  return topics.reduce((s, t) => s + (Number(t.marks) || 0), 0);
};

// Registration number has 4 parts separated by 3 hyphens: year - serialNumber - part3 - part4
const getSerialFromRegistration = (regNo) => {
  if (regNo == null || String(regNo).trim() === '') return '—';
  const parts = String(regNo).trim().split('-');
  return parts.length >= 2 ? parts[1].trim() : '—';
};

// Subject order for result sheet (original – do not change; result sheet is source of truth)
const SUBJECT_ORDER = [
  'urdu', 'english', 'math', 'science', 'social studies', 'computer',
  'tarjuma tul quran', 'tq', 'islamiat', 'nazra', 'art',
];
const getSubjectSortIndex = (subjectName) => {
  if (!subjectName || typeof subjectName !== 'string') return SUBJECT_ORDER.length;
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
  return SUBJECT_ORDER.length;
};

const ResultSheet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedGrade = location.state?.selectedGrade ?? '';

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const courseCodesForGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const normalized = normalizeGradeForMatch(selectedGrade);
    if (!normalized) return [];
    return (courses || [])
      .filter((course) => {
        const topics = course.topics || [];
        for (const t of topics) {
          if (t.grade != null && normalizeGradeForMatch(t.grade) === normalized) return true;
        }
        return false;
      })
      .map((c) => c.code)
      .filter(Boolean);
  }, [courses, selectedGrade]);

  const coursesForGrade = useMemo(() => {
    return (courses || []).filter((c) => courseCodesForGrade.includes(c.code));
  }, [courses, courseCodesForGrade]);

  const studentsInGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const gradeStr = String(selectedGrade);
    return (students || [])
      .filter((s) => String(s.grade) === gradeStr)
      .sort((a, b) => {
        const nameA = (a.studentName || '').toLowerCase();
        const nameB = (b.studentName || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
      });
  }, [students, selectedGrade]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [studentsRes, coursesRes] = await Promise.all([
          axios.get(`${API_URL}/api/students-data`),
          axios.get(`${API_URL}/api/courses`),
        ]);
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.data || []));
        setCourses(coursesRes.data?.success ? (coursesRes.data.data || []) : []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedGrade || courseCodesForGrade.length === 0) {
      setRecordsByCourse({});
      return;
    }
    let cancelled = false;
    const fetchRecords = async () => {
      const byCourse = {};
      await Promise.all(
        courseCodesForGrade.map(async (code) => {
          if (cancelled) return;
          try {
            const res = await axios.get(`${API_URL}/api/records/course/${encodeURIComponent(code)}`);
            if (res.data?.success && res.data.data) byCourse[code] = res.data.data;
          } catch {
            // no record
          }
        })
      );
      if (!cancelled) setRecordsByCourse(byCourse);
    };
    fetchRecords();
    return () => { cancelled = true; };
  }, [selectedGrade, courseCodesForGrade]);

  // Matrix: subject rows, student columns. Each cell has { marks, percentage } for that subject. Rows sorted by SUBJECT_ORDER.
  const { subjectRows, studentTotals, studentPercentages } = useMemo(() => {
    const rows = coursesForGrade.map((course) => {
      const subjectName = (course.subject && String(course.subject).trim()) || course.courseName || course.code || '—';
      const courseTotal = getCourseTotalMarks(course);
      const record = recordsByCourse[course.code];
      const marksPerStudent = studentsInGrade.map((student) => {
        const entry = record?.students?.find((s) => String(s.registrationNumber) === String(student.registrationNumber));
        if (!entry || courseTotal <= 0) return null;
        const pct = Number(entry.overallPercentage);
        if (!Number.isFinite(pct)) return null;
        const marks = Math.round((pct / 100) * courseTotal * 100) / 100;
        const percentage = Math.round(pct * 100) / 100;
        return { marks, percentage };
      });
      return { subjectName, courseTotal, marksPerStudent };
    });
    rows.sort((a, b) => getSubjectSortIndex(a.subjectName) - getSubjectSortIndex(b.subjectName));

    // Total obtained per student (only from subjects they're enrolled in — cell non-null)
    const studentTotals = studentsInGrade.map((_, studentIdx) =>
      rows.reduce((sum, r) => {
        const cell = r.marksPerStudent[studentIdx];
        return sum + (cell ? cell.marks : 0);
      }, 0)
    );
    // Total max per student: only sum course totals for courses where this student has a cell (enrolled).
    // So Bio/Comp choice: Biology students don't include Computer max, and vice versa.
    const studentTotalMaxes = studentsInGrade.map((_, studentIdx) =>
      rows.reduce((sum, r) => {
        const cell = r.marksPerStudent[studentIdx];
        return sum + (cell ? r.courseTotal : 0);
      }, 0)
    );
    const studentPercentages = studentTotals.map((total, i) =>
      studentTotalMaxes[i] > 0 ? Math.round((total / studentTotalMaxes[i]) * 10000) / 100 : 0
    );

    return { subjectRows: rows, studentTotals, studentPercentages };
  }, [coursesForGrade, recordsByCourse, studentsInGrade]);

  const handleBack = () => {
    navigate('/reports', { state: { selectedGrade } });
  };

  if (!selectedGrade) {
    return (
      <div className="result-sheet-container">
        <CurriculumHeader />
        <div className="result-sheet-content">
          <p className="result-sheet-no-grade">No grade selected. Please go to Reports and select a grade first.</p>
          <button type="button" className="result-sheet-back-btn" onClick={() => navigate('/reports')}>
            <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="result-sheet-container">
        <CurriculumHeader />
        <div className="result-sheet-loading">Loading result sheet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-sheet-container">
        <CurriculumHeader />
        <div className="result-sheet-error">{error}</div>
        <button type="button" className="result-sheet-back-btn" onClick={handleBack}>
          <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
        </button>
      </div>
    );
  }

  return (
    <div className="result-sheet-container">
      <CurriculumHeader />
      <div className="result-sheet-content">
        <div className="result-sheet-header">
          <button type="button" className="result-sheet-back-btn" onClick={handleBack}>
            <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
          </button>
          <h2 className="result-sheet-title">Result Sheet — Grade {selectedGrade}</h2>
        </div>

        <div className="result-sheet-table-wrapper">
          <table className="result-sheet-table">
            <thead>
              <tr>
                <th className="result-sheet-th result-sheet-th-subject">Subject</th>
                {studentsInGrade.map((s) => (
                  <th key={s.registrationNumber} className="result-sheet-th result-sheet-th-student">
                    <span className="result-sheet-student-name">{s.studentName || s.registrationNumber || '—'}</span>
                    <span className="result-sheet-student-serial">{getSerialFromRegistration(s.registrationNumber)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjectRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="result-sheet-td result-sheet-td-subject">{row.subjectName}</td>
                  {row.marksPerStudent.map((cell, studentIdx) => (
                    <td key={studentsInGrade[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                      {cell != null ? (
                        <span className="result-sheet-cell-content">
                          <span className="result-sheet-cell-marks">{cell.marks}</span>
                          <span className="result-sheet-cell-pct"> ({cell.percentage}%)</span>
                        </span>
                      ) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="result-sheet-row-total">
                <td className="result-sheet-td result-sheet-td-subject">Total</td>
                {studentTotals.map((total, studentIdx) => (
                  <td key={studentsInGrade[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                    {total}
                  </td>
                ))}
              </tr>
              <tr className="result-sheet-row-percentage">
                <td className="result-sheet-td result-sheet-td-subject">Percentage</td>
                {studentPercentages.map((pct, studentIdx) => (
                  <td key={studentsInGrade[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                    {pct}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultSheet;
