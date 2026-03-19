import React from 'react';
import { useNavigate } from 'react-router-dom';
import CurriculumHeader from './CurriculumHeader';
import './RolesDashboard.css';

const svgProps = { width: 34, height: 34, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

const IconCourseAdmin = () => (
  <svg {...svgProps}>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h10" />
    <path d="M21 7l-3-3" />
    <path d="M18 4h3v3" />
  </svg>
);

const IconEducator = () => (
  <svg {...svgProps}>
    <path d="M4 19c0-4 3-7 8-7s8 3 8 7" />
    <circle cx="12" cy="7" r="3" />
  </svg>
);

const IconStudents = () => (
  <svg {...svgProps}>
    <path d="M16 11c1.66 0 3-1.34 3-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3Z" />
    <path d="M8 11c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Z" />
    <path d="M2 20c0-3.31 2.69-6 6-6" />
    <path d="M22 20c0-3.31-2.69-6-6-6" />
    <path d="M14 20c0-2.21-1.79-4-4-4s-4 1.79-4 4" />
  </svg>
);

const IconParents = () => (
  <svg {...svgProps}>
    <path d="M7 3v3" />
    <path d="M17 3v3" />
    <path d="M5 8h14" />
    <path d="M6 8v14h12V8" />
    <path d="M9 12h6" />
    <path d="M9 16h6" />
  </svg>
);

const RolesDashboard = () => {
  const navigate = useNavigate();

  const goCourseAdmin = () => {
    navigate('/course-admins');
  };

  const goEducatorAdmin = () => {
    navigate('/educators');
  };

  return (
    <div className="roles-dashboard-container">
      <CurriculumHeader />
      <div className="roles-dashboard-content">
        <h2 className="roles-dashboard-title">Role Dashboards</h2>
        <p className="roles-dashboard-subtitle">Choose which role view you want to manage.</p>

        <div className="roles-grid" role="region" aria-label="Role cards">
          <div
            className="roles-card"
            role="button"
            tabIndex={0}
            aria-label="Course Admin card"
            onClick={goCourseAdmin}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') goCourseAdmin();
            }}
          >
            <div className="roles-card-icon">
              <IconCourseAdmin />
            </div>
            <div className="roles-card-label">Course Admin</div>
          </div>

          <div
            className="roles-card"
            role="button"
            tabIndex={0}
            aria-label="Educator card"
            onClick={goEducatorAdmin}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') goEducatorAdmin();
            }}
          >
            <div className="roles-card-icon">
              <IconEducator />
            </div>
            <div className="roles-card-label">Educator</div>
          </div>

          <div className="roles-card" role="button" tabIndex={0} aria-label="Students card">
            <div className="roles-card-icon">
              <IconStudents />
            </div>
            <div className="roles-card-label">Students</div>
          </div>

          <div className="roles-card" role="button" tabIndex={0} aria-label="Parents card">
            <div className="roles-card-icon">
              <IconParents />
            </div>
            <div className="roles-card-label">Parents</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesDashboard;

