import React from 'react';
import './pageLayout.css';

const PageHeader = ({ title, subtitle }) => (
  <header className="app-page-header">
    <h1 className="app-page-title">{title}</h1>
    {subtitle ? <p className="app-page-subtitle">{subtitle}</p> : null}
  </header>
);

export default PageHeader;
