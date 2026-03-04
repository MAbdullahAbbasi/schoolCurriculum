import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './CurriculumHeader.css';

const svgProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const hamburgerIcon = (
  <svg {...svgProps} width="24" height="24">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const closeIcon = (
  <svg {...svgProps} width="24" height="24">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const iconStudentsData = (
  <svg {...svgProps}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const iconObjectives = (
  <svg {...svgProps}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const iconRecord = (
  <svg {...svgProps}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
    <line x1="9" y1="14" x2="15" y2="14" />
    <line x1="9" y1="18" x2="15" y2="18" />
    <line x1="9" y1="10" x2="15" y2="10" />
  </svg>
);

const iconReports = (
  <svg {...svgProps}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const iconGradingScheme = (
  <svg {...svgProps}>
    <path d="M12 3v18" />
    <path d="m8 7 4-4 4 4" />
    <path d="m8 17 4 4 4-4" />
    <path d="M3 12h4" />
    <path d="M17 12h4" />
    <path d="M7 12h10" />
  </svg>
);

const iconLogout = (
  <svg {...svgProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
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
            <span className="nav-btn-icon">{iconStudentsData}</span>
            Students Data
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/' ? 'active' : ''}`}
            onClick={handleObjectivesClick}
          >
            <span className="nav-btn-icon">{iconObjectives}</span>
            Objectives
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/record' ? 'active' : ''}`}
            onClick={handleRecordClick}
          >
            <span className="nav-btn-icon">{iconRecord}</span>
            Record
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/reports' ? 'active' : ''}`}
            onClick={handleReportsClick}
          >
            <span className="nav-btn-icon">{iconReports}</span>
            Reports
          </button>
          <button
            type="button"
            className={`nav-btn ${path === '/grading-scheme' ? 'active' : ''}`}
            onClick={handleGradingSchemeClick}
          >
            <span className="nav-btn-icon">{iconGradingScheme}</span>
            Grading Scheme
          </button>
          <button type="button" className="logout-button" onClick={handleLogout}>
            <span className="nav-btn-icon">{iconLogout}</span>
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
            <span className="nav-btn-icon">{iconStudentsData}</span>
            Students Data
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/' ? 'active' : ''}`}
            onClick={handleObjectivesClick}
          >
            <span className="nav-btn-icon">{iconObjectives}</span>
            Objectives
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/record' ? 'active' : ''}`}
            onClick={handleRecordClick}
          >
            <span className="nav-btn-icon">{iconRecord}</span>
            Record
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/reports' ? 'active' : ''}`}
            onClick={handleReportsClick}
          >
            <span className="nav-btn-icon">{iconReports}</span>
            Reports
          </button>
          <button
            type="button"
            className={`nav-drawer-btn ${path === '/grading-scheme' ? 'active' : ''}`}
            onClick={handleGradingSchemeClick}
          >
            <span className="nav-btn-icon">{iconGradingScheme}</span>
            Grading Scheme
          </button>
          <button type="button" className="nav-drawer-btn nav-drawer-logout" onClick={handleLogout}>
            <span className="nav-btn-icon">{iconLogout}</span>
            Log out
          </button>
        </nav>
      </aside>
    </header>
  );
};

export default CurriculumHeader;
