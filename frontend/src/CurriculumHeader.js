import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CurriculumHeader.css';

const CurriculumHeader = ({ onCreateCourseClick }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleStudentsDataClick = () => {
    navigate('/students-data');
  };

  const handleRecordClick = () => {
    navigate('/record');
  };

  const handleCreateCourseClick = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
    if (onCreateCourseClick) {
      onCreateCourseClick();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('curriculum_auth');
    window.location.reload();
  };

  return (
    <header className="curriculum-header">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 className="curriculum-title">School Curriculum</h1>
          <p className="curriculum-subtitle">Explore courses and topics by grade level</p>
        </div>
        <div className="header-buttons-group">
          <button
            className="students-data-button"
            onClick={handleStudentsDataClick}
          >
            Students Data
          </button>
          <button
            className="record-button"
            onClick={handleRecordClick}
          >
            Record
          </button>
          <button
            className="create-course-button"
            onClick={handleCreateCourseClick}
          >
            + Create Course
          </button>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>
    </header>
  );
};

export default CurriculumHeader;
