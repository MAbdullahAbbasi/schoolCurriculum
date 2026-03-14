import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconCancel, IconEdit, IconNotAttempted, IconSave } from './ButtonIcons';
import './StudentRecordDetail.css';

// Normalize grade for matching: any KG variant -> KG-1/KG-2/KG-3 (same logic as CreateCourseMarks; includes "K.G-II")
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

const StudentRecordDetail = () => {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const matrixTableRef = React.useRef(null);
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [questionMarks, setQuestionMarks] = useState({});
  const [notAttempted, setNotAttempted] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const topics = useMemo(() => course?.topics || [], [course]);
  const courseQuestions = useMemo(() => (course?.questions || []).sort((a, b) => a.questionIndex - b.questionIndex), [course]);
  const questionPartMarks = useMemo(() => course?.questionPartMarks || [], [course]);

  const totalMarksForCourse = useMemo(() => {
    if (questionPartMarks.length > 0) {
      return questionPartMarks.reduce((sum, m) => sum + (Number(m.marks) || 0), 0);
    }
    return topics.reduce((sum, t) => sum + (t.marks || 0), 0);
  }, [topics, questionPartMarks]);

  const slots = useMemo(() => {
    if (questionPartMarks.length > 0) {
      const sorted = [...questionPartMarks].sort(
        (a, b) => Number(a.questionIndex) - Number(b.questionIndex) || Number(a.partIndex) - Number(b.partIndex)
      );
      return sorted.map((m) => {
        const q = Number(m.questionIndex);
        const part = Number(m.partIndex);
        const slotKey = part === 0 ? `q${q}` : `q${q}-p${part}`;
        const label = part === 0 ? `Q${q}` : `Q${q} Part ${part}`;
        const maxMarks = Number(m.marks) || 0;
        return {
          slotKey,
          label,
          maxMarks,
          questionIndex: q,
          partIndex: part,
          topicIndices: [],
        };
      });
    }
    if (!courseQuestions.length) return [];
    return courseQuestions.map((q) => {
      const indices = (q.topicIndices || []).map((i) => Number(i));
      const maxMarks = indices.reduce((s, i) => s + (topics[i]?.marks || 0), 0);
      return {
        slotKey: `q${q.questionIndex}`,
        label: `Q${q.questionIndex}`,
        maxMarks,
        questionIndex: q.questionIndex,
        partIndex: 0,
        topicIndices: indices,
      };
    });
  }, [courseQuestions, topics, questionPartMarks]);

  const compulsoryQuestions = useMemo(() => {
    const n = course?.compulsoryQuestions;
    return n != null && Number(n) >= 0 ? Number(n) : null;
  }, [course]);

  const courseGrades = useMemo(() => {
    const grades = new Set();
    topics.forEach((t) => {
      if (t.grade != null && t.grade !== '') {
        grades.add(normalizeGradeForMatch(t.grade));
      }
    });
    return grades;
  }, [topics]);

  // Class 8 only: course subject (Biology or Computer) – enroll only students with matching subject
  const courseSubjectForGrade8 = useMemo(() => {
    if (!courseGrades.has('8')) return null;
    const sub = (course?.subject && String(course.subject).trim()) || '';
    if (sub === 'Biology' || sub === 'Computer') return sub;
    return null;
  }, [course, courseGrades]);

  const enrolledStudents = useMemo(() => {
    if (courseGrades.size === 0) return students;
    return students.filter((s) => {
      const normalized = normalizeGradeForMatch(s.grade);
      if (normalized === '' || !courseGrades.has(normalized)) return false;
      // Class 8 Biology/Computer: only include students whose subject matches the course
      if (courseSubjectForGrade8 && normalized === '8') {
        const studentSub = (s.subject && String(s.subject).trim()) || '';
        return studentSub === courseSubjectForGrade8;
      }
      return true;
    });
  }, [students, courseGrades, courseSubjectForGrade8]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const courseResponse = await axios.get(`${API_URL}/api/courses`);
      if (courseResponse.data.success) {
        const foundCourse = courseResponse.data.data.find((c) => c.code === courseCode);
        if (foundCourse) setCourse(foundCourse);
        else {
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
          const qMarks = {};
          const nAttempted = {};
          (record.students || []).forEach((stu) => {
            const reg = stu.registrationNumber;
            qMarks[reg] = { ...(stu.questionMarks || {}) };
            nAttempted[reg] = new Set(stu.notAttemptedSlots || []);
          });
          setQuestionMarks(qMarks);
          setNotAttempted(nAttempted);
          setIsEditMode(false);
        } else {
          setIsEditMode(true);
        }
      } catch {
        setIsEditMode(true);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [courseCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getQuestionMark = (registrationNumber, slotKey) => {
    const byStu = questionMarks[registrationNumber];
    if (!byStu) return '';
    const v = byStu[slotKey];
    return v === undefined || v === null ? '' : String(v);
  };

  const setQuestionMark = (registrationNumber, slotKey, value, maxMarks) => {
    setQuestionMarks((prev) => {
      const next = { ...prev };
      if (!next[registrationNumber]) next[registrationNumber] = {};
      if (value === '' || value == null) {
        delete next[registrationNumber][slotKey];
        return next;
      }
      let num = parseFloat(value);
      if (Number.isNaN(num)) return prev;
      if (num < 0) num = 0;
      if (maxMarks != null && Number(maxMarks) >= 0 && num > Number(maxMarks)) num = Number(maxMarks);
      next[registrationNumber][slotKey] = num;
      return next;
    });
  };

  const isNotAttempted = (registrationNumber, slotKey) => {
    return (notAttempted[registrationNumber] || new Set()).has(slotKey);
  };

  const toggleNotAttempted = (registrationNumber, slotKey) => {
    setNotAttempted((prev) => {
      const next = { ...prev };
      if (!next[registrationNumber]) next[registrationNumber] = new Set();
      const set = new Set(next[registrationNumber]);
      if (set.has(slotKey)) {
        set.delete(slotKey);
      } else {
        set.add(slotKey);
        setQuestionMarks((p) => {
          const n = { ...p };
          if (n[registrationNumber]) {
            const o = { ...n[registrationNumber] };
            delete o[slotKey];
            n[registrationNumber] = o;
          }
          return n;
        });
      }
      next[registrationNumber] = set;
      return next;
    });
  };

  const computeLeftOnChoiceForStudent = (registrationNumber) => {
    if (compulsoryQuestions == null || compulsoryQuestions < 1) return [];
    const qM = questionMarks[registrationNumber] || {};
    const na = notAttempted[registrationNumber] || new Set();
    const withMarks = slots.filter((s) => {
      if (na.has(s.slotKey)) return false;
      const v = qM[s.slotKey];
      return v != null && Number(v) > 0;
    });
    if (withMarks.length < compulsoryQuestions) return [];
    const noMarksNotNA = slots.filter((s) => !na.has(s.slotKey) && !(Number(qM[s.slotKey]) > 0));
    return noMarksNotNA.map((s) => s.slotKey);
  };

  const getTotalForStudent = (registrationNumber) => {
    const leftOnChoice = computeLeftOnChoiceForStudent(registrationNumber);
    const qM = questionMarks[registrationNumber] || {};
    const na = notAttempted[registrationNumber] || new Set();
    return slots.reduce((sum, s) => {
      if (na.has(s.slotKey) || leftOnChoice.includes(s.slotKey)) return sum;
      return sum + (Number(qM[s.slotKey]) || 0);
    }, 0);
  };

  const handleMarkKeyDown = (e, slotIndex, studentIndex) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const totalSlots = slots.length;
    const totalStudents = enrolledStudents.length;
    if (!matrixTableRef.current || totalSlots === 0 || totalStudents === 0) return;

    let nextSlot = slotIndex + 1;
    let nextStudent = studentIndex;

    if (nextSlot >= totalSlots) {
      nextSlot = 0;
      nextStudent = studentIndex + 1;
    }

    if (nextStudent >= totalStudents) return;

    const selector = `input[data-slot-index="${nextSlot}"][data-student-index="${nextStudent}"]`;
    const nextInput = matrixTableRef.current.querySelector(selector);
    if (nextInput) {
      nextInput.focus();
    }
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

  const handleCancel = () => navigate('/record');

  const handleSaveRecord = async () => {
    if (!course) return;

    const studentsData = enrolledStudents.map((student) => {
      const reg = student.registrationNumber;
      const qM = questionMarks[reg] || {};
      const na = Array.from(notAttempted[reg] || []);
      const leftOnChoice = computeLeftOnChoiceForStudent(reg);
      const total = getTotalForStudent(reg);
      const percentage = totalMarksForCourse > 0 ? Math.round((total / totalMarksForCourse) * 10000) / 100 : 0;
      const grade = calculateGrade(percentage);

      const questionMarksPayload = {};
      slots.forEach((s) => {
        const v = qM[s.slotKey];
        if (v != null && !na.includes(s.slotKey)) questionMarksPayload[s.slotKey] = Number(v);
      });

      return {
        registrationNumber: reg,
        studentName: student.studentName,
        weightageScores: {},
        questionMarks: questionMarksPayload,
        notAttemptedSlots: na,
        leftOnChoiceSlots: leftOnChoice,
        overallPercentage: percentage,
        overallGrade: grade,
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

  const handleEditClick = () => setIsEditMode(true);

  if (loading) {
    return (
      <div className="student-record-detail-container">
        <CurriculumHeader />
        <div className="loading-spinner">
          <div className="spinner" />
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

  const hasSlots = slots.length > 0;

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
              <span className="info-label">Questions:</span>
              <span className="info-value">{slots.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Total Marks:</span>
              <span className="info-value">{totalMarksForCourse}</span>
            </div>
            {compulsoryQuestions != null && (
              <div className="info-item">
                <span className="info-label">Compulsory questions:</span>
                <span className="info-value">{compulsoryQuestions} of {slots.length}</span>
              </div>
            )}
          </div>
        </div>

        <div className="students-table-section">
          <div className="table-header-section">
            <h3>Marks by question and student</h3>
          </div>
          {compulsoryQuestions != null && (
            <p className="compulsory-hint">
              Enter marks for at least {compulsoryQuestions} question(s). Remaining questions can be left on choice (stored as &quot;Left on choice&quot;) if compulsory are attempted.
            </p>
          )}

          {enrolledStudents.length > 0 && hasSlots ? (
            <>
              <div className="table-wrapper matrix-table-wrapper" ref={matrixTableRef}>
                <table className={`students-record-table matrix-table ${!isEditMode ? 'read-only' : ''}`}>
                  <thead>
                    <tr>
                      <th className="matrix-th-srno">Sr. No</th>
                      <th className="matrix-th-objective">Question</th>
                      <th className="matrix-th-max">Max</th>
                      {enrolledStudents.map((student) => (
                        <React.Fragment key={student.registrationNumber}>
                          <th className="matrix-th-student">{student.studentName} ({student.registrationNumber})</th>
                          <th className="matrix-th-not-attempted">Not attempted</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((slot, idx) => (
                      <tr key={slot.slotKey}>
                        <td className="matrix-td-srno">{idx + 1}</td>
                        <td className="matrix-td-objective">{slot.label}</td>
                        <td className="matrix-td-max">{slot.maxMarks}</td>
                        {enrolledStudents.map((student, studentIndex) => {
                          const reg = student.registrationNumber;
                          const na = isNotAttempted(reg, slot.slotKey);
                          return (
                            <React.Fragment key={reg}>
                              <td className="matrix-td-mark">
                                {isEditMode ? (
                                  na ? (
                                    <span className="not-attempted-label">Not attempted</span>
                                  ) : (
                                    <div className="matrix-mark-cell-with-hint">
                                      <input
                                        type="number"
                                        min={0}
                                        max={slot.maxMarks}
                                        step="0.01"
                                        className="score-input matrix-score-input"
                                        value={getQuestionMark(reg, slot.slotKey)}
                                        onChange={(e) => setQuestionMark(reg, slot.slotKey, e.target.value, slot.maxMarks)}
                                        onKeyDown={(e) => handleMarkKeyDown(e, idx, studentIndex)}
                                        placeholder="0"
                                        aria-label={`Marks for ${slot.label} - ${student.studentName}`}
                                        data-slot-index={idx}
                                        data-student-index={studentIndex}
                                      />
                                      <span className="matrix-mark-max-hint">Max: {slot.maxMarks}</span>
                                    </div>
                                  )
                                ) : (
                                  <span className="score-display">
                                    {na ? 'Not attempted' : (getQuestionMark(reg, slot.slotKey) !== '' ? parseFloat(getQuestionMark(reg, slot.slotKey)).toFixed(2) : '—')}
                                  </span>
                                )}
                              </td>
                              <td className="matrix-td-not-attempted-btn">
                                {isEditMode && (
                                  <button
                                    type="button"
                                    className={`not-attempted-btn ${na ? 'not-attempted-btn-active' : ''}`}
                                    onClick={() => toggleNotAttempted(reg, slot.slotKey)}
                                    aria-pressed={na}
                                  >
                                    <span className="btn-icon-wrap"><IconNotAttempted />{na ? 'Undo' : 'Not attempted'}</span>
                                  </button>
                                )}
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="matrix-total-row">
                      <td className="matrix-td-srno" />
                      <td className="matrix-td-objective total-label">Total (obtained)</td>
                      <td className="matrix-td-max">{totalMarksForCourse}</td>
                      {enrolledStudents.map((student) => {
                        const total = getTotalForStudent(student.registrationNumber);
                        const leftOnChoice = computeLeftOnChoiceForStudent(student.registrationNumber);
                        return (
                          <React.Fragment key={student.registrationNumber}>
                            <td colSpan="2" className="matrix-td-total">
                              <span className="total-value">{total.toFixed(2)}</span>
                              <span className="total-out-of"> / {totalMarksForCourse}</span>
                              {leftOnChoice.length > 0 && (
                                <span className="left-on-choice-badge"> ({leftOnChoice.length} left on choice)</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="matrix-form-actions">
                <button type="button" className="cancel-record-button" onClick={handleCancel}>
                  <span className="btn-icon-wrap"><IconCancel />Cancel</span>
                </button>
                {!isEditMode ? (
                  <button type="button" className="edit-record-button" onClick={handleEditClick}>
                    <span className="btn-icon-wrap"><IconEdit />Edit</span>
                  </button>
                ) : (
                  <button type="button" className="save-record-button" onClick={handleSaveRecord} disabled={saving}>
                    <span className="btn-icon-wrap"><IconSave />{saving ? 'Saving...' : 'Submit'}</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h2>No data to show</h2>
              <p>
                {enrolledStudents.length === 0 && !hasSlots
                  ? 'Add students in the course grade(s) and ensure the course has questions mapped to objectives.'
                  : enrolledStudents.length === 0
                    ? "No students in this course's grade(s). Upload student data for the relevant grade(s)."
                    : 'This course has no questions defined. Create the course with the question mapping first.'}
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
