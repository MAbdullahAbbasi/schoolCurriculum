import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import PageHeader from './PageHeader';
import GuestTour from './GuestTour';
import { getPageMeta, isTopLevelPath } from './pageTitles';
import {
  getAuthRole,
  getAuthUsername,
  hasCompletedPortalTour,
  isGuestRole,
  markPortalTourCompleted,
} from './authUtils';
import { getPortalTourSteps } from './portalTourSteps';
import { IconAlumni } from './ButtonIcons';
import './AppLayout.css';
import './pageLayout.css';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tourKey, setTourKey] = useState(0);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { title, subtitle } = getPageMeta(pathname);
  const showBack = !isTopLevelPath(pathname);

  const role = getAuthRole();
  const username = getAuthUsername();
  const isGuest = isGuestRole(role);
  const tourSteps = useMemo(() => getPortalTourSteps(role), [role]);

  useEffect(() => {
    if (!role || !username || tourSteps.length === 0) return;

    setSidebarOpen(true);

    if (isGuest) {
      setTourKey(1);
      return;
    }

    if (!hasCompletedPortalTour(username)) {
      setTourKey(1);
    }
  }, [role, username, isGuest, tourSteps.length]);

  const replayGuestTour = () => {
    setSidebarOpen(true);
    setTourKey((k) => k + 1);
  };

  const handleTourComplete = useCallback(() => {
    if (!isGuest && username) {
      markPortalTourCompleted(username);
    }
  }, [isGuest, username]);

  const ensureSidebarOpen = useCallback(() => setSidebarOpen(true), []);

  return (
    <div className="app-layout">
      <AppSidebar open={sidebarOpen} onClose={closeSidebar} />
      {tourKey > 0 && tourSteps.length > 0 && (
        <GuestTour
          key={tourKey}
          steps={tourSteps}
          runToken={tourKey}
          onEnsureSidebarOpen={ensureSidebarOpen}
          onComplete={handleTourComplete}
        />
      )}
      <div className={`app-main ${sidebarOpen ? 'app-main--sidebar-open' : ''}`}>
        {isGuest && (
          <div className="guest-mode-banner" role="status" data-guest-tour="guest-banner">
            Guest demo — you can explore the full portal, but changes cannot be saved.
            <button type="button" className="guest-tour-replay-btn" onClick={replayGuestTour}>
              Replay tour
            </button>
          </div>
        )}
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label={sidebarOpen ? 'Close navigation panel' : 'Open navigation panel'}
          aria-expanded={sidebarOpen}
        >
          {sidebarOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          )}
        </button>
        <div className="app-main-content" data-guest-tour="main-content">
          <div className="app-page-panel">
            <PageHeader
              title={title}
              subtitle={subtitle}
              showBack={showBack}
              actions={
                pathname === '/students-data' ? (
                  <button
                    type="button"
                    className="app-page-alumni-btn"
                    onClick={() => navigate('/students-data/alumni')}
                  >
                    <IconAlumni />
                    Alumni
                  </button>
                ) : null
              }
            />
            <div className="app-page-body">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      <div
        className={`app-sidebar-overlay ${sidebarOpen ? 'app-sidebar-overlay--visible' : ''}`}
        onClick={closeSidebar}
        role="presentation"
      />
    </div>
  );
};

export default AppLayout;
