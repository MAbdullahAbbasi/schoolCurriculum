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
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const topics = course?.topics || [];
  const totalMarksForCourse = topics.reduce((sum, t) => sum + (t.marks || 0), 0);

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
          setHasExistingRecord(true);
          setIsEditMode(false);
        } else {
          setHasExistingRecord(false);
          setIsEditMode(true);
        }
      } catch (recordError) {
        setHasExistingRecord(false);
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

  const setMark = (registrationNumber, topicIndex, value) => {
    const num = value === '' ? undefined : (parseFloat(value) || 0);
    setObjectiveMarks(prev => {
      const next = { ...prev };
      if (!next[registrationNumber]) next[registrationNumber] = {};
      if (num === undefined) {
        delete next[registrationNumber][String(topicIndex)];
      } else {
        next[registrationNumber][String(topicIndex)] = num;
      }
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

    const studentsData = students.map(student => {
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
        setHasExistingRecord(true);
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
          </div>

          {students.length > 0 && topics.length > 0 ? (
            <>
              <div className="table-wrapper matrix-table-wrapper">
                <table className={`students-record-table matrix-table ${!isEditMode ? 'read-only' : ''}`}>
                  <thead>
                    <tr>
                      <th className="matrix-th-objective">Objective</th>
                      {students.map((student) => (
                        <th key={student.registrationNumber} className="matrix-th-student">
                          {student.studentName} ({student.registrationNumber})
                        </th>
                      ))}
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
                        {students.map((student) => (
                          <td key={student.registrationNumber} className="matrix-td-mark">
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                max={topic.marks != null ? topic.marks : 100}
                                step="0.01"
                                className="score-input matrix-score-input"
                                value={getMark(student.registrationNumber, topicIndex)}
                                onChange={(e) => setMark(student.registrationNumber, topicIndex, e.target.value)}
                                placeholder="0"
                              />
                            ) : (
                              <span className="score-display">
                                {getMark(student.registrationNumber, topicIndex) !== ''
                                  ? parseFloat(getMark(student.registrationNumber, topicIndex)).toFixed(2)
                                  : '-'}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="matrix-total-row">
                      <td className="matrix-td-objective total-label">Total</td>
                      {students.map((student) => {
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
                {students.length === 0 && topics.length === 0
                  ? 'Add students and ensure the course has objectives.'
                  : students.length === 0
                    ? 'Please upload student data first.'
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
