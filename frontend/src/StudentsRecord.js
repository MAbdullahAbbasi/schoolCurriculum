import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './StudentsRecord.css';

const StudentsRecord = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingCourseCode, setDeletingCourseCode] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/courses`);
      if (response.data.success) {
        setCourses(response.data.data || []);
      } else {
        setError('Failed to fetch courses');
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to fetch courses. Please try again later.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseCode) => {
    navigate(`/studentRecord/${courseCode}`);
  };

  const handleDeleteCourse = async (e, courseCode, courseName) => {
    e.stopPropagation();
    if (!window.confirm(`Delete course "${courseName || courseCode}"? This will also remove its student record. This cannot be undone.`)) return;
    try {
      setDeletingCourseCode(courseCode);
      setError(null);
      await axios.delete(`${API_URL}/api/courses/${encodeURIComponent(courseCode)}`);
      await fetchCourses();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete course.';
      setError(msg);
    } finally {
      setDeletingCourseCode(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL courses and their records? This cannot be undone.')) return;
    try {
      setDeletingAll(true);
      setError(null);
      await axios.delete(`${API_URL}/api/courses`);
      await fetchCourses();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete courses.';
      setError(msg);
    } finally {
      setDeletingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="students-record-container">
        <CurriculumHeader />
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="students-record-container">
      <CurriculumHeader />
      <div className="students-record-content">
        <h2>Students Record</h2>
        <p>Select a course to view and manage student records</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {courses.length > 0 ? (
          <>
            <div className="courses-record-actions">
              <button
                type="button"
                className="delete-all-courses-btn"
                onClick={handleDeleteAll}
                disabled={deletingAll}
              >
                {deletingAll ? 'Deleting...' : 'Delete all'}
              </button>
            </div>
            <div className="courses-grid">
              {courses.map((course) => (
                <div
                  key={course._id || course.code}
                  className="course-card"
                  onClick={() => handleCourseClick(course.code)}
                >
                  <div className="course-card-header">
                    <h3 className="course-card-title">{course.courseName}</h3>
                    <span className="course-card-code">{course.code}</span>
                    <button
                      type="button"
                      className="course-card-delete-btn"
                      onClick={(e) => handleDeleteCourse(e, course.code, course.courseName)}
                      disabled={deletingCourseCode === course.code}
                      title="Delete course"
                      aria-label="Delete course"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                <div className="course-card-details">
                  <div className="course-detail-item">
                    <span className="detail-label">Duration:</span>
                    <span className="detail-value">
                      {course.courseDuration?.value} {course.courseDuration?.type}
                    </span>
                  </div>
                  <div className="course-detail-item">
                    <span className="detail-label">Start Date:</span>
                    <span className="detail-value">
                      {course.startingDate ? new Date(course.startingDate).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="course-detail-item">
                    <span className="detail-label">Topics:</span>
                    <span className="detail-value">{course.topics?.length || 0}</span>
                  </div>
                  <div className="course-detail-item">
                    <span className="detail-label">Weightage Items:</span>
                    <span className="detail-value">
                      {course.weightage?.map(w => w.label).join(', ') || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>No Courses Available</h2>
            <p>No courses found. Please create a course first.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentsRecord;
