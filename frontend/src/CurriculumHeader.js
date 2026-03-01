import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CurriculumHeader.css';

const hamburgerIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const closeIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CurriculumHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  const handleStudentsDataClick = () => {
    navigate('/students-data');
    closeMenu();
  };
  const handleRecordClick = () => {
    navigate('/record');
    closeMenu();
  };
  const handleObjectivesClick = () => {
    navigate('/');
    closeMenu();
  };
  const handleReportsClick = () => {
    navigate('/reports');
    closeMenu();
  };
  const handleGradingSchemeClick = () => {
    navigate('/grading-scheme');
    closeMenu();
  };
  const handleLogout = () => {
    localStorage.removeItem('curriculum_auth');
    window.location.reload();
  };

  return (
    <header className="curriculum-header">
      <div className="curriculum-header-inner">
        <div className="curriculum-header-brand">
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
            className={`nav-btn ${path === '/' ? 'active' : ''}`}
            onClick={handleObjectivesClick}
          >
            Objectives
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
        <button
          type="button"
          className="header-hamburger-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
        >
          {hamburgerIcon}
        </button>
      </div>

      <div
        className={`header-nav-overlay ${menuOpen ? 'header-nav-overlay-open' : ''}`}
        onClick={closeMenu}
        role="button"
        aria-label="Close menu"
      />
      <aside className={`header-nav-drawer ${menuOpen ? 'header-nav-drawer-open' : ''}`}>
        <div className="header-nav-drawer-header">
          <span className="header-nav-drawer-title">Menu</span>
          <button
            type="button"
            className="header-nav-close-btn"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            {closeIcon}
          </button>
        </div>
        <nav className="header-nav-drawer-nav">
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/students-data' ? 'active' : ''}`}
            onClick={handleStudentsDataClick}
          >
            Students Data
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/' ? 'active' : ''}`}
            onClick={handleObjectivesClick}
          >
            Objectives
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/record' ? 'active' : ''}`}
            onClick={handleRecordClick}
          >
            Record
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/reports' ? 'active' : ''}`}
            onClick={handleReportsClick}
          >
            Reports
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/grading-scheme' ? 'active' : ''}`}
            onClick={handleGradingSchemeClick}
          >
            Grading Scheme
          </button>
          <button type="button" className="nav-drawer-btn nav-drawer-logout" onClick={handleLogout}>
            Log out
          </button>
        </nav>
      </aside>
    </header>
  );
};

export default CurriculumHeader;
