import React from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_LABELS, ROLE_LABELS } from './roleLabels';
import './RolesDashboard.css';

const svgProps = {
  width: 42,
  height: 42,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** Forest Keeper – guardian of paths (trees) */
const IconForestKeeper = () => (
  <svg {...svgProps} className="roles-card-svg roles-card-svg--keeper">
    <path d="M12 3v4" />
    <path d="M12 21v-8" />
    <path d="M8 14c0-2 1.5-4 4-4s4 2 4 4" />
    <path d="M6 10c0-2.5 2-5 6-5s6 2.5 6 5" />
    <path d="M4 7c0-2 2.5-5 8-5s8 3 8 5" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

/** Gardener – tending growth */
const IconGardener = () => (
  <svg {...svgProps} className="roles-card-svg roles-card-svg--gardener">
    <path d="M10 11c-2 0-3-1.5-3-3.5S8 4 10 4" />
    <path d="M14 11c2 0 3-1.5 3-3.5S16 4 14 4" />
    <path d="M12 11v10" />
    <path d="M9 21h6" />
    <path d="M7 15h10" />
    <path d="M6 8l-2 2" />
    <path d="M18 8l2 2" />
  </svg>
);

/** Seedling – young learner */
const IconSeedling = () => (
  <svg {...svgProps} className="roles-card-svg roles-card-svg--seedling">
    <path d="M12 22v-6" />
    <path d="M12 10c-2 2-4 1.5-4-1s2-4 4-4" />
    <path d="M12 10c2 2 4 1.5 4-1s-2-4-4-4" />
    <ellipse cx="12" cy="20" rx="3" ry="1.2" fill="currentColor" fillOpacity="0.15" stroke="none" />
  </svg>
);

/** Nurturer – family care */
const IconNurturer = () => (
  <svg {...svgProps} className="roles-card-svg roles-card-svg--nurturer">
    <path d="M12 21s-4-3-4-7c0-2.5 2-4.5 4-4.5s4 2 4 4.5c0 4-4 7-4 7z" />
    <path d="M8 7c0-2 1.5-3.5 3.5-3.5S15 5 15 7" />
    <path d="M9 7V5.5" />
    <path d="M15 7V5.5" />
    <path d="M12 14v3" strokeDasharray="2 2" />
  </svg>
);

const RolesDashboard = () => {
  const navigate = useNavigate();

  const goForestKeeper = () => navigate('/course-admins');
  const goGardener = () => navigate('/educators');

  return (
    <div className="roles-dashboard-container">      <div className="roles-dashboard-content">
        <header className="roles-dashboard-hero">
          <span className="roles-dashboard-badge" aria-hidden="true">
            <span className="roles-dashboard-badge-leaf">🌿</span>
          </span>
          <h2 className="roles-dashboard-title page-local-header">{APP_LABELS.rolesDashboardTitle}</h2>
          <p className="roles-dashboard-subtitle page-local-header">{APP_LABELS.rolesDashboardSubtitle}</p>
        </header>

        <div className="roles-grid" role="region" aria-label="Community roles">
          <div
            className="roles-card roles-card--interactive roles-card--delay-0"
            role="button"
            tabIndex={0}
            aria-label={`${ROLE_LABELS.forestKeeper} — open management`}
            onClick={goForestKeeper}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') goForestKeeper();
            }}
          >
            <div className="roles-card-glow" aria-hidden />
            <div className="roles-card-icon">
              <IconForestKeeper />
            </div>
            <div className="roles-card-label">{ROLE_LABELS.forestKeeper}</div>
            <p className="roles-card-hint">Paths, courses &amp; canopy</p>
          </div>

          <div
            className="roles-card roles-card--interactive roles-card--delay-1"
            role="button"
            tabIndex={0}
            aria-label={`${ROLE_LABELS.gardener} — open management`}
            onClick={goGardener}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') goGardener();
            }}
          >
            <div className="roles-card-glow" aria-hidden />
            <div className="roles-card-icon">
              <IconGardener />
            </div>
            <div className="roles-card-label">{ROLE_LABELS.gardener}</div>
            <p className="roles-card-hint">Tend classes &amp; blooms</p>
          </div>

          <div
            className="roles-card roles-card--static roles-card--delay-2"
            role="note"
            tabIndex={0}
            aria-label={`${ROLE_LABELS.seedling} — coming soon`}
          >
            <div className="roles-card-icon">
              <IconSeedling />
            </div>
            <div className="roles-card-label">{ROLE_LABELS.seedling}</div>
            <p className="roles-card-hint roles-card-hint--muted">Learner view — soon</p>
          </div>

          <div
            className="roles-card roles-card--static roles-card--delay-3"
            role="note"
            tabIndex={0}
            aria-label={`${ROLE_LABELS.nurturer} — coming soon`}
          >
            <div className="roles-card-icon">
              <IconNurturer />
            </div>
            <div className="roles-card-label">{ROLE_LABELS.nurturer}</div>
            <p className="roles-card-hint roles-card-hint--muted">Family portal — soon</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesDashboard;
