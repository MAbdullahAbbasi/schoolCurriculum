import React from 'react';
import { useNavigate } from 'react-router-dom';
import './pageLayout.css';

const PageHeader = ({ title, subtitle, showBack }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <header className="app-page-header">
      {showBack && (
        <button
          type="button"
          className="app-page-back-btn"
          onClick={handleBack}
          aria-label="Go back to previous page"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
      )}
      <h1 className="app-page-title">{title}</h1>
      {subtitle ? <p className="app-page-subtitle">{subtitle}</p> : null}
    </header>
  );
};

export default PageHeader;
