import React from 'react';
import { Outlet } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';
import './publicSite.css';

export default function PublicLayout() {
  return (
    <div className="ps-root">
      <a href="#main-content" className="ps-skip-link">
        Skip to main content
      </a>
      <PublicNavbar />
      <main id="main-content" className="ps-main">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
