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

  const handleCreateCourseClick = () => {
    // This will be handled by the header's navigation
  };

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

  if (loading) {
    return (
      <div className="students-record-container">
        <CurriculumHeader onCreateCourseClick={handleCreateCourseClick} />
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="students-record-container">
      <CurriculumHeader onCreateCourseClick={handleCreateCourseClick} />
      <div className="students-record-content">
        <h2>Students Record</h2>
        <p>Select a course to view and manage student records</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {courses.length > 0 ? (
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
