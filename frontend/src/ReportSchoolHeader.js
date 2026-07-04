import React from 'react';
import logoShsCircle from './assets/logo-shs-circle.png';
import logoShsText from './assets/logoright.jpg';
import './ReportSchoolHeader.css';

/** Shared letterhead for report cards, individual reports, and result sheet PDFs. */
const ReportSchoolHeader = ({ sessionName }) => (
  <header className="report-school-header">
    <img
      src={logoShsCircle}
      alt="Sapling High School logo"
      className="report-school-header-logo report-school-header-logo-left"
    />
    <div className="report-school-header-title-block">
      <h2 className="report-school-header-school">
        <span className="report-school-header-school-first">S</span>APLING{' '}
        <span className="report-school-header-school-first">H</span>IGH{' '}
        <span className="report-school-header-school-first">S</span>CHOOL
        <span className="report-school-header-registered">(Registered)</span>
      </h2>
      <p className="report-school-header-subtitle">(Boys/ Girls)</p>
      <h3 className="report-school-header-session">{sessionName || '—'}</h3>
    </div>
    <img src={logoShsText} alt="SHS" className="report-school-header-logo report-school-header-logo-right" />
  </header>
);

export default ReportSchoolHeader;
