import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import PageHeader from './PageHeader';
import { getPageMeta, isTopLevelPath } from './pageTitles';
import './AppLayout.css';
import './pageLayout.css';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const { pathname } = useLocation();
  const { title, subtitle } = getPageMeta(pathname);
  const showBack = !isTopLevelPath(pathname);

  return (
    <div className="app-layout">
      <AppSidebar open={sidebarOpen} onClose={closeSidebar} />
      <div className={`app-main ${sidebarOpen ? 'app-main--sidebar-open' : ''}`}>
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
        <div className="app-main-content">
          <div className="app-page-panel">
            <PageHeader title={title} subtitle={subtitle} showBack={showBack} />
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
