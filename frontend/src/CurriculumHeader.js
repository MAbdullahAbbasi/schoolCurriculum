import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CurriculumHeader.css';

const CurriculumHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const handleStudentsDataClick = () => navigate('/students-data');
  const handleRecordClick = () => navigate('/record');
  const handleObjectivesClick = () => navigate('/');
  const handleReportsClick = () => navigate('/reports');
  const handleGradingSchemeClick = () => navigate('/grading-scheme');
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
            type="button"
            className={`nav-btn ${path === '/students-data' ? 'active' : ''}`}
            onClick={handleStudentsDataClick}
          >
            Students Data
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/record' ? 'active' : ''}`}
            onClick={handleRecordClick}
          >
            Record
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/' ? 'active' : ''}`}
            onClick={handleObjectivesClick}
          >
            Objectives
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/reports' ? 'active' : ''}`}
            onClick={handleReportsClick}
          >
            Reports
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/grading-scheme' ? 'active' : ''}`}
            onClick={handleGradingSchemeClick}
          >
            Grading Scheme
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
