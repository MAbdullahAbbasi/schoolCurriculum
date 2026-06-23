import React from 'react';
import logoLeft from './assets/logoleft.jpg';
import logoRight from './assets/logoright.jpg';
import './StudentReportCard.css';

/** Compact report card: logo, student details, and marksheet table (for bulk PDF). */
const StudentReportCard = ({ reportData }) => {
  if (!reportData) return null;

  return (
    <article className="student-report-card">
      <div className="student-report-card-header">
        <img src={logoLeft} alt="" className="student-report-card-logo student-report-card-logo-left" />
        <div className="student-report-card-title-block">
          <h2 className="student-report-card-school">
            <span className="student-report-card-school-first">S</span>APLING{' '}
            <span className="student-report-card-school-first">H</span>IGH{' '}
            <span className="student-report-card-school-first">S</span>CHOOL{' '}
            <span className="student-report-card-registered">(Registered)</span>
          </h2>
          <p className="student-report-card-subtitle">(Boys/ Girls)</p>
          <h3 className="student-report-card-exam">Annual Examination {reportData.reportMonthYear}</h3>
        </div>
        <img src={logoRight} alt="" className="student-report-card-logo student-report-card-logo-right" />
      </div>

      <div className="student-report-card-details">
        <div className="student-report-card-detail-row">
          <span><strong>Name:</strong> {reportData.displayName}</span>
          <span><strong>Class:</strong> {reportData.displayClass}</span>
        </div>
        <div className="student-report-card-detail-row">
          <span><strong>Father&apos;s Name:</strong> {reportData.displayFatherName}</span>
          <span><strong>Registration #:</strong> {reportData.displayRegNo}</span>
        </div>
        <div className="student-report-card-detail-row student-report-card-detail-row-three">
          <span><strong>D.o.Birth:</strong> {reportData.displayDob}</span>
          <span><strong>Age:</strong> {reportData.studentAge}</span>
          <span><strong>Avg. age in class:</strong> {reportData.averageAgeInClass}</span>
        </div>
      </div>

      <div className="student-report-card-table-wrap">
        <table className="student-report-card-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Max. Marks</th>
              <th>Marks. Obtained</th>
              <th>Grade</th>
              <th>Highest Marks in Class</th>
            </tr>
          </thead>
          <tbody>
            {(reportData.marksheetRows || []).map((row) => (
              <tr key={row.key}>
                <td>{row.label}</td>
                <td className="student-report-card-num">{row.maxTotal ?? ''}</td>
                <td className="student-report-card-num">{row.obtainedTotal ?? ''}</td>
                <td>{row.grade ?? ''}</td>
                <td className="student-report-card-num">{row.highestInClass ?? ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="student-report-card-total-row">
              <td><strong>Total</strong></td>
              <td className="student-report-card-num">{reportData.totalMax}</td>
              <td className="student-report-card-num">{reportData.totalObtained}</td>
              <td colSpan={2} />
            </tr>
            <tr>
              <td colSpan={3} />
              <td><strong>Percentage</strong></td>
              <td className="student-report-card-num">{reportData.totalPercentage}</td>
            </tr>
            {reportData.classPosition != null && (
              <tr>
                <td colSpan={3} />
                <td><strong>Position</strong></td>
                <td className="student-report-card-num">{reportData.classPosition}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </article>
  );
};

export const ReportCardsPdfPage = ({ cards }) => (
  <div className="report-cards-pdf-page">
    {cards.map((reportData, idx) => (
      <StudentReportCard key={reportData.displayRegNo || idx} reportData={reportData} />
    ))}
  </div>
);

export default StudentReportCard;
