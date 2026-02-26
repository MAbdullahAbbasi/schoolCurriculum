import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './StudentRecordDetail.css';

const StudentRecordDetail = () => {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [objectiveMarks, setObjectiveMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const topics = course?.topics || [];
  const totalMarksForCourse = topics.reduce((sum, t) => sum + (t.marks || 0), 0);

  // Grades that this course's objectives belong to (from curriculum selection)
  const courseGrades = React.useMemo(() => {
    const grades = new Set();
    topics.forEach((t) => {
      if (t.grade != null && t.grade !== '') grades.add(String(t.grade));
    });
    return grades;
  }, [topics]);

  // Only students in those grades are "enrolled" (shown in the matrix)
  const enrolledStudents = React.useMemo(() => {
    if (courseGrades.size === 0) return students;
    return students.filter((s) => courseGrades.has(String(s.grade)));
  }, [students, courseGrades]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const courseResponse = await axios.get(`${API_URL}/api/courses`);
      if (courseResponse.data.success) {
        const foundCourse = courseResponse.data.data.find(c => c.code === courseCode);
        if (foundCourse) {
          setCourse(foundCourse);
        } else {
          setError('Course not found');
          setLoading(false);
          return;
        }
      }

      const studentsResponse = await axios.get(`${API_URL}/api/students-data`);
      const studentsList = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
      setStudents(studentsList);

      try {
        const recordResponse = await axios.get(`${API_URL}/api/records/course/${courseCode}`);
        if (recordResponse.data.success && recordResponse.data.data) {
          const record = recordResponse.data.data;
          const marks = {};
          (record.students || []).forEach(student => {
            const om = student.objectiveMarks || {};
            marks[student.registrationNumber] = Object.keys(om).reduce((acc, k) => {
              acc[k] = typeof om[k] === 'number' ? om[k] : parseFloat(om[k]) || 0;
              return acc;
            }, {});
          });
          setObjectiveMarks(marks);
          setIsEditMode(false);
        } else {
          setIsEditMode(true);
        }
      } catch (recordError) {
        setIsEditMode(true);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getMark = (registrationNumber, topicIndex) => {
    const byStudent = objectiveMarks[registrationNumber];
    if (!byStudent) return '';
    const v = byStudent[String(topicIndex)];
    return v === undefined || v === null ? '' : String(v);
  };

  const setMark = (registrationNumber, topicIndex, value, maxMarks) => {
    if (value === '') {
      setObjectiveMarks(prev => {
        const next = { ...prev };
        if (next[registrationNumber]) {
          delete next[registrationNumber][String(topicIndex)];
        }
        return next;
      });
      return;
    }
    let num = parseFloat(value);
    if (Number.isNaN(num)) return;
    if (num < 0) num = 0;
    if (maxMarks != null && Number(maxMarks) >= 0 && num > Number(maxMarks)) num = Number(maxMarks);
    setObjectiveMarks(prev => {
      const next = { ...prev };
      if (!next[registrationNumber]) next[registrationNumber] = {};
      next[registrationNumber][String(topicIndex)] = num;
      return next;
    });
  };

  const getTotalForStudent = (registrationNumber) => {
    const byStudent = objectiveMarks[registrationNumber];
    if (!byStudent) return 0;
    return topics.reduce((sum, _, idx) => sum + (byStudent[String(idx)] || 0), 0);
  };

  const calculateGrade = (totalOutOfHundred) => {
    const p = totalOutOfHundred;
    if (p >= 90) return 'A+';
    if (p >= 85) return 'A';
    if (p >= 80) return 'B+';
    if (p >= 75) return 'B';
    if (p >= 70) return 'C+';
    if (p >= 65) return 'C';
    if (p >= 60) return 'D+';
    if (p >= 55) return 'D';
    if (p >= 50) return 'E';
    return 'F';
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 3000);
  };

  const handleCancel = () => {
    navigate('/record');
  };

  const handleSaveRecord = async () => {
    if (!course) return;

    const studentsData = enrolledStudents.map(student => {
      const byStudent = objectiveMarks[student.registrationNumber] || {};
      const total = topics.reduce((sum, _, idx) => sum + (byStudent[String(idx)] || 0), 0);
      const objectiveMarksPayload = {};
      topics.forEach((_, idx) => {
        const v = byStudent[String(idx)];
        if (v !== undefined && v !== null) objectiveMarksPayload[String(idx)] = Number(v);
      });

      return {
        registrationNumber: student.registrationNumber,
        studentName: student.studentName,
        weightageScores: {},
        objectiveMarks: objectiveMarksPayload,
        overallPercentage: Math.round(total * 100) / 100,
        overallGrade: calculateGrade(total),
      };
    });

    const recordData = {
      courseCode: course.code,
      courseName: course.courseName,
      students: studentsData,
    };

    try {
      setSaving(true);
      setError(null);
      const response = await axios.post(`${API_URL}/api/records`, recordData);
      if (response.data.success) {
        setIsEditMode(false);
        showToast('Record saved successfully!', 'success');
      } else {
        showToast(response.data.message || 'Failed to save record', 'error');
      }
    } catch (err) {
      console.error('Error saving record:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save record';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const downloadIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const triggerDownload = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadAllReports = () => {
    if (!course || enrolledStudents.length === 0 || topics.length === 0) return;
    const headers = ['Objective', 'Max Marks', ...enrolledStudents.map(s => `${s.studentName} (${s.registrationNumber})`)];
    const rows = topics.map((topic, topicIndex) => {
      const name = topic.topicName || topic.courseCode || `Objective ${topicIndex + 1}`;
      const maxMarks = topic.marks != null ? String(topic.marks) : '';
      const studentMarks = enrolledStudents.map(s => getMark(s.registrationNumber, topicIndex) !== '' ? getMark(s.registrationNumber, topicIndex) : '');
      return [name, maxMarks, ...studentMarks];
    });
    const totalRow = ['Total', totalMarksForCourse, ...enrolledStudents.map(s => getTotalForStudent(s.registrationNumber).toFixed(2))];
    const csvRows = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')), totalRow.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')];
    triggerDownload(`${course.courseName || courseCode}_all_reports.csv`, '\uFEFF' + csvRows.join('\r\n'));
  };

  const handleDownloadRowReport = (topicIndex) => {
    if (!course || enrolledStudents.length === 0 || topicIndex < 0 || !topics[topicIndex]) return;
    const topic = topics[topicIndex];
    const name = topic.topicName || topic.courseCode || `Objective ${topicIndex + 1}`;
    const headers = ['Student Name', 'Registration Number', 'Marks'];
    const rows = enrolledStudents.map(s => {
      const mark = getMark(s.registrationNumber, topicIndex);
      return [s.studentName, s.registrationNumber, mark !== '' ? mark : '-'];
    });
    const csvRows = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))];
    triggerDownload(`${course.courseName || courseCode}_${name.replace(/[^a-zA-Z0-9]/g, '_')}.csv`, '\uFEFF' + csvRows.join('\r\n'));
  };

  if (loading) {
    return (
      <div className="student-record-detail-container">
        <CurriculumHeader />
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading course and student data...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="student-record-detail-container">
        <CurriculumHeader />
        <div className="error-message">{error || 'Course not found'}</div>
      </div>
    );
  }

  return (
    <div className="student-record-detail-container">
      <CurriculumHeader />

      <div className="record-detail-content">
        <div className="course-details-section">
          <h2>{course.courseName}</h2>
          <div className="course-info-grid">
            <div className="info-item">
              <span className="info-label">Course Code:</span>
              <span className="info-value">{course.code}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Duration:</span>
              <span className="info-value">
                {course.courseDuration?.value} {course.courseDuration?.type}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Objectives:</span>
              <span className="info-value">{topics.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Marks:</span>
              <span className="info-value">{totalMarksForCourse}</span>
            </div>
          </div>
        </div>

        <div className="students-table-section">
          <div className="table-header-section">
            <h3>Marks by objective and student</h3>
            <button
              type="button"
              className="download-all-reports-btn"
              onClick={handleDownloadAllReports}
              disabled={enrolledStudents.length === 0 || topics.length === 0}
            >
              <span className="download-all-reports-icon">{downloadIcon}</span>
              Download all Reports
            </button>
          </div>

          {enrolledStudents.length > 0 && topics.length > 0 ? (
            <>
              <div className="table-wrapper matrix-table-wrapper">
                <table className={`students-record-table matrix-table ${!isEditMode ? 'read-only' : ''}`}>
                  <thead>
                    <tr>
                      <th className="matrix-th-objective">Objective</th>
                      {enrolledStudents.map((student) => (
                        <th key={student.registrationNumber} className="matrix-th-student">
                          {student.studentName} ({student.registrationNumber})
                        </th>
                      ))}
                      <th className="matrix-th-action">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topics.map((topic, topicIndex) => (
                      <tr key={topicIndex}>
                        <td className="matrix-td-objective">
                          {topic.topicName || topic.courseCode || `Objective ${topicIndex + 1}`}
                          {topic.marks != null && (
                            <span className="objective-max-marks"> (max {topic.marks})</span>
                          )}
                        </td>
                        {enrolledStudents.map((student) => {
                          const maxForObjective = topic.marks != null ? topic.marks : 100;
                          return (
                          <td key={student.registrationNumber} className="matrix-td-mark">
                            {isEditMode ? (
                              <div className="matrix-mark-cell-with-hint">
                                <input
                                  type="number"
                                  min={0}
                                  max={maxForObjective}
                                  step="0.01"
                                  className="score-input matrix-score-input"
                                  value={getMark(student.registrationNumber, topicIndex)}
                                  onChange={(e) => setMark(student.registrationNumber, topicIndex, e.target.value, maxForObjective)}
                                  placeholder="0"
                                  aria-describedby={`hint-${topicIndex}-${student.registrationNumber}`}
                                />
                                <span id={`hint-${topicIndex}-${student.registrationNumber}`} className="matrix-mark-max-hint">
                                  Max: {maxForObjective}
                                </span>
                              </div>
                            ) : (
                              <span className="score-display">
                                {getMark(student.registrationNumber, topicIndex) !== ''
                                  ? parseFloat(getMark(student.registrationNumber, topicIndex)).toFixed(2)
                                  : '-'}
                              </span>
                            )}
                          </td>
                          );
                        })}
                        <td className="matrix-td-action">
                          <button
                            type="button"
                            className="download-row-btn"
                            onClick={() => handleDownloadRowReport(topicIndex)}
                            title="Download this objective's report"
                            aria-label="Download report for this objective"
                          >
                            {downloadIcon}
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="matrix-total-row">
                      <td className="matrix-td-objective total-label">Total</td>
                      {enrolledStudents.map((student) => {
                        const total = getTotalForStudent(student.registrationNumber);
                        return (
                          <td key={student.registrationNumber} className="matrix-td-total">
                            <span className="total-value">{total.toFixed(2)}</span>
                            {totalMarksForCourse > 0 && (
                              <span className="total-out-of"> / {totalMarksForCourse}</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="matrix-td-action matrix-td-action-total" />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="matrix-form-actions">
                <button type="button" className="cancel-record-button" onClick={handleCancel}>
                  Cancel
                </button>
                {!isEditMode ? (
                  <button type="button" className="edit-record-button" onClick={handleEditClick}>
                    Edit
                  </button>
                ) : (
                  <button
                    type="button"
                    className="save-record-button"
                    onClick={handleSaveRecord}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Submit'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h2>No data to show</h2>
              <p>
                {enrolledStudents.length === 0 && topics.length === 0
                  ? 'Add students in the course grade(s) and ensure the course has objectives.'
                  : enrolledStudents.length === 0
                    ? 'No students in this course\'s grade(s). Upload student data for the relevant grade(s).'
                    : 'This course has no objectives.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default StudentRecordDetail;
