import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconDownload, IconView } from './ButtonIcons';
import './Reports.css';

// Normalize grade for matching (e.g. K.G-II, KG-2 -> same)
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

const percentageToGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 85) return 'A';
  if (pct >= 80) return 'B+';
  if (pct >= 75) return 'B';
  if (pct >= 70) return 'C+';
  if (pct >= 65) return 'C';
  if (pct >= 60) return 'D+';
  if (pct >= 55) return 'D';
  if (pct >= 50) return 'E';
  return 'F';
};

// Sort order: KG classes first, then numeric grades ascending
const gradeSortOrder = (g) => {
  const s = String(g).trim();
  if (/^KG[- ]?1$/i.test(s) || /^KG[- ]?I$/i.test(s)) return 0;
  if (/^KG[- ]?2$/i.test(s) || /^KG[- ]?II$/i.test(s)) return 1;
  if (/^KG[- ]?3$/i.test(s) || /^KG[- ]?III$/i.test(s)) return 2;
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return 100;
  return 10 + n;
};

const Reports = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [selectedGrade, setSelectedGrade] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Grades present in DB (from students), sorted: KG first, then 1–10
  const gradesFromDb = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.grade != null && String(s.grade).trim() !== '') set.add(String(s.grade).trim());
    });
    return Array.from(set).sort((a, b) => gradeSortOrder(a) - gradeSortOrder(b));
  }, [students]);

  const handleViewReport = (student) => {
    navigate(`/reports/student/${encodeURIComponent(student.registrationNumber)}`, { state: { student } });
  };

  const studentsInGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const gradeStr = String(selectedGrade);
    return students
      .filter((s) => String(s.grade) === gradeStr)
      .sort((a, b) => {
        const nameA = (a.studentName || '').toLowerCase();
        const nameB = (b.studentName || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
      });
  }, [students, selectedGrade]);

  // Courses that belong to the selected grade (topic grades match)
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

  // Course total marks (from topics or questionPartMarks)
  const getCourseTotalMarks = (course) => {
    if (!course) return 0;
    const qpm = course.questionPartMarks || [];
    if (qpm.length > 0) return qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
    const topics = course.topics || [];
    return topics.reduce((s, t) => s + (Number(t.marks) || 0), 0);
  };

  // Top 3 students by aggregate marks across all courses for this grade
  const topThreeStudents = useMemo(() => {
    if (!selectedGrade || studentsInGrade.length === 0) return [];
    const coursesList = (courses || []).filter((c) => courseCodesForGrade.includes(c.code));
    const rankList = studentsInGrade.map((student) => {
      let obtained = 0;
      let totalMax = 0;
      coursesList.forEach((course) => {
        const record = recordsByCourse[course.code];
        const entry = record?.students?.find((s) => String(s.registrationNumber) === String(student.registrationNumber));
        const courseTotal = getCourseTotalMarks(course);
        if (entry && courseTotal > 0) {
          const pct = Number(entry.overallPercentage);
          if (Number.isFinite(pct)) {
            obtained += (pct / 100) * courseTotal;
            totalMax += courseTotal;
          }
        }
      });
      const percentage = totalMax > 0 ? Math.round((obtained / totalMax) * 10000) / 100 : 0;
      const grade = percentageToGrade(percentage);
      return { student, obtained: Math.round(obtained * 100) / 100, totalMax, percentage, grade };
    });
    rankList.sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.obtained !== a.obtained) return b.obtained - a.obtained;
      return (a.student.studentName || '').localeCompare(b.student.studentName || '');
    });
    return rankList.slice(0, 3);
  }, [selectedGrade, studentsInGrade, courses, courseCodesForGrade, recordsByCourse]);

  useEffect(() => {
    const fetchStudentsAndCourses = async () => {
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
        setError('Failed to load students.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentsAndCourses();
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
            // no record for this course
          }
        })
      );
      if (!cancelled) setRecordsByCourse(byCourse);
    };
    fetchRecords();
    return () => { cancelled = true; };
  }, [selectedGrade, courseCodesForGrade]);

  const triggerDownload = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadReport = (student) => {
    if (!student) return;
    const headers = ['Student Name', 'Registration Number', 'Grade'];
    const row = [
      student.studentName || '',
      student.registrationNumber || '',
      student.grade != null ? String(student.grade) : selectedGrade,
    ];
    const csvRows = [
      headers.join(','),
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
    ];
    const filename = `Grade_${selectedGrade}_${student.studentName}_${student.registrationNumber}.csv`.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    triggerDownload(filename, '\uFEFF' + csvRows.join('\r\n'));
  };

  const handleDownloadAllReports = () => {
    if (!selectedGrade || studentsInGrade.length === 0) return;
    const headers = ['Student Name', 'Registration Number', 'Grade'];
    const dataRows = studentsInGrade.map((student) =>
      [
        student.studentName || '',
        student.registrationNumber || '',
        student.grade != null ? String(student.grade) : selectedGrade,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows].join('\r\n');
    const filename = `Grade_${selectedGrade}_All_Reports.csv`;
    triggerDownload(filename, csvContent);
  };

  if (loading) {
    return (
      <div className="reports-container">
        <CurriculumHeader />
        <div className="reports-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <CurriculumHeader />
        <div className="reports-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <CurriculumHeader />
      <div className="reports-content">
        <h2 className="reports-title">Reports</h2>
        <p className="reports-subtitle">Select a grade to view students and download reports.</p>

        <div className="reports-select-wrapper">
          <label htmlFor="reports-grade-select" className="reports-select-label">
            Grade
          </label>
          <select
            id="reports-grade-select"
            className="reports-select"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="">Select a grade</option>
            {gradesFromDb.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>

        {!selectedGrade && (
          <div className="reports-prompt">Please select a grade above to view students.</div>
        )}

        {selectedGrade && (
          <>
            {studentsInGrade.length > 0 && topThreeStudents.length > 0 && (
              <div className="reports-top-three-card">
                <div className="reports-top-three-header">
                  <span className="reports-top-three-icon" aria-hidden="true">🏆</span>
                  <h3 className="reports-top-three-title">Top 3 Performers</h3>
                  <span className="reports-top-three-subtitle">Congratulations to our achievers!</span>
                </div>
                <div className="reports-top-three-list">
                  {topThreeStudents.map((item, idx) => {
                    const position = idx + 1;
                    const posClass = position === 1 ? 'first' : position === 2 ? 'second' : 'third';
                    const trophy = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
                    return (
                      <div key={item.student.registrationNumber} className={`reports-top-three-item reports-top-three-${posClass}`}>
                        <div className="reports-top-three-item-medal" aria-hidden="true">{trophy}</div>
                        <div className="reports-top-three-item-body">
                          <div className="reports-top-three-item-name">{item.student.studentName || '—'}</div>
                          <div className="reports-top-three-item-meta">
                            <span>Reg. No: {item.student.registrationNumber || '—'}</span>
                            <span>Marks: {item.obtained} / {item.totalMax}</span>
                            <span>{item.percentage}%</span>
                            <span className="reports-top-three-item-grade">Grade: {item.grade}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="reports-download-all-wrapper">
              <button
                type="button"
                className="reports-download-all-btn"
                onClick={handleDownloadAllReports}
                disabled={studentsInGrade.length === 0}
                title="Download all reports for this grade"
                aria-label="Download all reports for this grade"
              >
                <span className="btn-icon-wrap"><IconDownload />Download All Reports</span>
              </button>
            </div>
            <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th className="reports-th">Registration Number</th>
                  <th className="reports-th">Name</th>
                  <th className="reports-th reports-th-action">Action</th>
                  <th className="reports-th reports-th-report">Report.</th>
                </tr>
              </thead>
              <tbody>
                {studentsInGrade.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="reports-empty-cell">
                      No students in Grade {selectedGrade}.
                    </td>
                  </tr>
                ) : (
                  studentsInGrade.map((student) => (
                    <tr key={student.registrationNumber}>
                      <td className="reports-td">{student.registrationNumber}</td>
                      <td className="reports-td">{student.studentName}</td>
                      <td className="reports-td reports-td-action">
                        <button
                          type="button"
                          className="reports-view-btn"
                          onClick={() => handleViewReport(student)}
                          title={`View report for ${student.studentName}`}
                          aria-label={`View report for ${student.studentName}`}
                        >
                          <span className="btn-icon-wrap"><IconView />View</span>
                        </button>
                      </td>
                      <td className="reports-td reports-td-report">
                        <button
                          type="button"
                          className="reports-download-btn"
                          onClick={() => handleDownloadReport(student)}
                          title={`Download report for ${student.studentName}`}
                          aria-label={`Download report for ${student.studentName}`}
                        >
                          <span className="btn-icon-wrap"><IconDownload />Download</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
