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
        <h2>Courses Record</h2>
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
            <div className="courses-table-wrapper">
              <table className="courses-record-table">
                <thead>
                  <tr>
                    <th>Course Name</th>
                    <th>Course Code</th>
                    <th>Duration</th>
                    <th>Start Date</th>
                    <th>Topics</th>
                    <th>Weightage</th>
                    <th className="courses-table-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course._id || course.code}
                      className="courses-record-row"
                      onClick={() => handleCourseClick(course.code)}
                    >
                      <td>{course.courseName || '-'}</td>
                      <td>{course.code || '-'}</td>
                      <td>
                        {course.courseDuration?.value != null && course.courseDuration?.type
                          ? `${course.courseDuration.value} ${course.courseDuration.type}`
                          : '-'}
                      </td>
                      <td>
                        {course.startingDate
                          ? new Date(course.startingDate).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td>{course.topics?.length ?? 0}</td>
                      <td>{course.weightage?.map((w) => w.label).join(', ') || 'N/A'}</td>
                      <td className="courses-table-td-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="course-row-delete-btn"
                          onClick={(e) => handleDeleteCourse(e, course.code, course.courseName)}
                          disabled={deletingCourseCode === course.code}
                          title="Delete course"
                          aria-label="Delete course"
                        >
                          {deletingCourseCode === course.code ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
