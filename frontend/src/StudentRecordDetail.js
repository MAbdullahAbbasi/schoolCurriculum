import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import './StudentRecordDetail.css';

const StudentRecordDetail = () => {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentScores, setStudentScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasExistingRecord, setHasExistingRecord] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  useEffect(() => {
    fetchData();
  }, [courseCode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch course data
      const courseResponse = await axios.get(`http://localhost:5000/api/courses`);
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

      // Fetch students data
      const studentsResponse = await axios.get('http://localhost:5000/api/students-data');
      setStudents(studentsResponse.data || []);

      // Fetch existing record if any
      try {
        const recordResponse = await axios.get(`http://localhost:5000/api/records/course/${courseCode}`);
        if (recordResponse.data.success && recordResponse.data.data) {
          const record = recordResponse.data.data;
          // Populate scores from existing record
          const scores = {};
          record.students.forEach(student => {
            scores[student.registrationNumber] = {
              weightageScores: student.weightageScores || {},
              overallPercentage: student.overallPercentage || 0,
              overallGrade: student.overallGrade || '',
            };
          });
          setStudentScores(scores);
          setHasExistingRecord(true);
          setIsEditMode(false); // Start in view mode if record exists
        } else {
          setHasExistingRecord(false);
          setIsEditMode(true); // Start in edit mode if no record exists
        }
      } catch (recordError) {
        // No existing record, that's okay
        console.log('No existing record found');
        setHasExistingRecord(false);
        setIsEditMode(true); // Start in edit mode if no record exists
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (registrationNumber, weightageLabel, value) => {
    setStudentScores(prev => {
      const updated = { ...prev };
      if (!updated[registrationNumber]) {
        updated[registrationNumber] = {
          weightageScores: {},
          overallPercentage: 0,
          overallGrade: '',
        };
      }
      updated[registrationNumber].weightageScores[weightageLabel] = parseFloat(value) || 0;
      
      // Calculate overall percentage
      const overall = calculateOverallPercentage(registrationNumber, updated[registrationNumber].weightageScores);
      updated[registrationNumber].overallPercentage = overall;
      updated[registrationNumber].overallGrade = calculateGrade(overall);
      
      return updated;
    });
  };

  const calculateOverallPercentage = (registrationNumber, weightageScores) => {
    if (!course || !course.weightage) return 0;

    let total = 0;
    course.weightage.forEach(weightageItem => {
      const score = weightageScores[weightageItem.label] || 0;
      const weight = weightageItem.percentage / 100;
      total += score * weight;
    });

    return Math.round(total * 100) / 100; // Round to 2 decimal places
  };

  const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 85) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 75) return 'B';
    if (percentage >= 70) return 'C+';
    if (percentage >= 65) return 'C';
    if (percentage >= 60) return 'D+';
    if (percentage >= 55) return 'D';
    if (percentage >= 50) return 'E';
    return 'F';
  };

  const validateAllFields = () => {
    if (!course || !course.weightage) return { isValid: false, message: 'Course data not available' };

    const missingFields = [];
    
    students.forEach(student => {
      course.weightage.forEach(weightageItem => {
        const scores = studentScores[student.registrationNumber];
        const score = scores?.weightageScores?.[weightageItem.label];
        
        if (score === undefined || score === null || score === '') {
          missingFields.push(`${student.studentName} - ${weightageItem.label}`);
        }
      });
    });

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Please fill all fields. Missing: ${missingFields.slice(0, 3).join(', ')}${missingFields.length > 3 ? '...' : ''}`
      };
    }

    return { isValid: true };
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  const handleSaveRecord = async () => {
    if (!course) return;

    // Validate all fields are filled
    const validation = validateAllFields();
    if (!validation.isValid) {
      showToast(validation.message, 'error');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Prepare students data
      const studentsData = students.map(student => {
        const scores = studentScores[student.registrationNumber] || {
          weightageScores: {},
          overallPercentage: 0,
          overallGrade: 'F',
        };

        return {
          registrationNumber: student.registrationNumber,
          studentName: student.studentName,
          weightageScores: scores.weightageScores,
          overallPercentage: scores.overallPercentage,
          overallGrade: scores.overallGrade,
        };
      });

      const recordData = {
        courseCode: course.code,
        courseName: course.courseName,
        students: studentsData,
      };

      const response = await axios.post('http://localhost:5000/api/records', recordData);

      if (response.data.success) {
        setHasExistingRecord(true);
        setIsEditMode(false); // Switch to view mode after successful save
        showToast('Record saved successfully!', 'success');
      } else {
        showToast(response.data.message || 'Failed to save record', 'error');
      }
    } catch (err) {
      console.error('Error saving record:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save record';
      const shortMessage = errorMessage.split(' ').slice(0, 5).join(' ');
      showToast(shortMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleCreateCourseClick = () => {
    // This will be handled by the header's navigation
  };

  if (loading) {
    return (
      <div className="student-record-detail-container">
        <CurriculumHeader onCreateCourseClick={handleCreateCourseClick} />
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
        <CurriculumHeader onCreateCourseClick={handleCreateCourseClick} />
        <div className="error-message">
          {error || 'Course not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="student-record-detail-container">
      <CurriculumHeader onCreateCourseClick={handleCreateCourseClick} />
      
      <div className="record-detail-content">
        {/* Course Details Section */}
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
              <span className="info-label">Start Date:</span>
              <span className="info-value">
                {course.startingDate ? new Date(course.startingDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Topics:</span>
              <span className="info-value">{course.topics?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Students Table Section */}
        <div className="students-table-section">
          <div className="table-header-section">
            <h3>Student Records</h3>
            {!isEditMode && hasExistingRecord && (
              <button
                className="edit-record-button"
                onClick={handleEditClick}
              >
                Edit
              </button>
            )}
          </div>
          {students.length > 0 ? (
            <div className="table-wrapper">
              <table className={`students-record-table ${!isEditMode ? 'read-only' : ''}`}>
                <thead>
                  <tr>
                    <th>Registration Number</th>
                    <th>Student Name</th>
                    {course.weightage?.map((item, index) => (
                      <th key={index}>
                        {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                        <span className="weightage-percent">({item.percentage}%)</span>
                      </th>
                    ))}
                    <th>Overall Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const scores = studentScores[student.registrationNumber] || {
                      weightageScores: {},
                      overallPercentage: 0,
                      overallGrade: 'F',
                    };

                    return (
                      <tr key={index}>
                        <td>{student.registrationNumber}</td>
                        <td>{student.studentName}</td>
                        {course.weightage?.map((item, weightIndex) => (
                          <td key={weightIndex}>
                            {isEditMode ? (
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                className="score-input"
                                value={scores.weightageScores[item.label] || ''}
                                onChange={(e) => handleScoreChange(student.registrationNumber, item.label, e.target.value)}
                                placeholder="0"
                              />
                            ) : (
                              <span className="score-display">
                                {scores.weightageScores[item.label] !== undefined && scores.weightageScores[item.label] !== null && scores.weightageScores[item.label] !== ''
                                  ? parseFloat(scores.weightageScores[item.label]).toFixed(2)
                                  : '-'}
                              </span>
                            )}
                          </td>
                        ))}
                        <td className="grade-cell">
                          <span className="percentage-display">{scores.overallPercentage.toFixed(2)}%</span>
                          <span className="grade-display">{scores.overallGrade}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h2>No Students Available</h2>
              <p>Please upload student data first.</p>
            </div>
          )}

          {students.length > 0 && isEditMode && (
            <div className="save-button-container">
              <button
                className="save-record-button"
                onClick={handleSaveRecord}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Record'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast toast-${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default StudentRecordDetail;
