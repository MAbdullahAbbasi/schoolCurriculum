import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { APP_LABELS } from './roleLabels';
import './AppSidebar.css';

const svgProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

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

const iconRoles = (
  <svg {...svgProps}>
    <rect x="3" y="3" width="7" height="7" rx="1" ry="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" ry="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" ry="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" ry="1" />
  </svg>
);

const iconRootLogins = (
  <svg {...svgProps}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const iconLogout = (
  <svg {...svgProps}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const pathMatches = (path, prefixes) => prefixes.some((p) => (p === '/' ? path === '/' : path === p || path.startsWith(`${p}/`)));

const AppSidebar = ({ open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const role = (() => {
    try {
      const raw = localStorage.getItem('curriculum_auth');
      const auth = raw ? JSON.parse(raw) : null;
      return auth?.role || null;
    } catch (_) {
      return null;
    }
  })();

  const isRootAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN';
  const isCourseAdmin = role === 'COURSE_ADMIN';
  const isSuperAdmin = isAdmin;

  const canViewObjectives = isAdmin || isCourseAdmin;
  const canViewReports = isAdmin || isCourseAdmin;
  const canViewGradingScheme = isAdmin || isCourseAdmin;

  useEffect(() => {
    if (window.innerWidth <= 768) onClose();
  }, [path, onClose]);

  const go = (to) => {
    navigate(to);
    if (window.innerWidth <= 768) onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem('curriculum_auth');
    window.location.reload();
  };

  const navBtn = (label, icon, to, activePrefixes, className = '') => (
    <button
      type="button"
      className={`sidebar-nav-btn ${pathMatches(path, activePrefixes) ? 'active' : ''} ${className}`}
      onClick={() => go(to)}
    >
      <span className="sidebar-nav-icon">{icon}</span>
      <span className="sidebar-nav-label">{label}</span>
    </button>
  );

  return (
    <aside className={`app-sidebar ${open ? 'app-sidebar--open' : ''}`} aria-label="Main navigation">
      <div className="app-sidebar-brand">
        <h1 className="app-sidebar-title">{APP_LABELS.brandTitle}</h1>
        <p className="app-sidebar-tagline">{APP_LABELS.brandTagline}</p>
      </div>
      <nav className="app-sidebar-nav">
        {isRootAdmin && navBtn('All logins', iconRootLogins, '/root-logins', ['/root-logins'])}
        {!isRootAdmin && canViewObjectives && navBtn('Objectives', iconObjectives, '/', ['/', '/create-course'])}
        {!isRootAdmin && isSuperAdmin && navBtn(APP_LABELS.groveNav, iconRoles, '/roles', ['/roles', '/course-admins', '/educators', '/students-data'])}
        {!isRootAdmin && navBtn('Record', iconRecord, '/record', ['/record', '/studentRecord'])}
        {!isRootAdmin && canViewReports && navBtn('Reports', iconReports, '/reports', ['/reports'])}
        {!isRootAdmin && canViewGradingScheme && navBtn('Grading Scheme', iconGradingScheme, '/grading-scheme', ['/grading-scheme'])}
      </nav>
      <div className="app-sidebar-footer">
        <button type="button" className="sidebar-nav-btn sidebar-nav-logout" onClick={handleLogout}>
          <span className="sidebar-nav-icon">{iconLogout}</span>
          <span className="sidebar-nav-label">Log out</span>
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
