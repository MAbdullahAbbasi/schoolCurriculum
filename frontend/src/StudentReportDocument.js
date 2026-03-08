import React from 'react';
import logoLeft from './assets/logoleft.jpg';
import logoRight from './assets/logoright.jpg';
import { formatGradingSchemeForDisplay } from './reportUtils';
import './StudentReportDetail.css';

export const StudentReportCover = ({ reportData }) => (
  <section className="student-report-cover-section">
    <div className="student-report-cover-top">
      <img src={logoLeft} alt="School logo" className="student-report-cover-logo student-report-cover-logo-left" />
      <div className="student-report-cover-title-block">
        <h2 className="student-report-cover-school-title">Sapling High School <span className="student-report-cover-registered">(Registered)</span></h2>
        <p className="student-report-cover-school-subtitle">(Boys/ Girls)</p>
        <h3 className="student-report-cover-term-title">Term Exam {reportData.reportMonthYear}</h3>
      </div>
      <img src={logoRight} alt="SHS logo" className="student-report-cover-logo student-report-cover-logo-right" />
    </div>

    <div className="student-report-cover-details-grid">
      <div className="student-report-cover-detail">
        <span className="student-report-cover-label">Name:</span>
        <span className="student-report-cover-value">{reportData.displayName}</span>
      </div>
      <div className="student-report-cover-detail">
        <span className="student-report-cover-label">Class:</span>
        <span className="student-report-cover-value">{reportData.displayClass}</span>
      </div>
      <div className="student-report-cover-detail">
        <span className="student-report-cover-label">Father&apos;s Name:</span>
        <span className="student-report-cover-value">{reportData.displayFatherName}</span>
      </div>
      <div className="student-report-cover-detail">
        <span className="student-report-cover-label">Registration #:</span>
        <span className="student-report-cover-value">{reportData.displayRegNo}</span>
      </div>
      <div className="student-report-cover-detail">
        <span className="student-report-cover-label">D.o.Birth:</span>
        <span className="student-report-cover-value">{reportData.displayDob}</span>
      </div>
      <div className="student-report-cover-detail">
        <span className="student-report-cover-label">Age:</span>
        <span className="student-report-cover-value">{reportData.studentAge}</span>
      </div>
      <div className="student-report-cover-detail student-report-cover-detail-wide">
        <span className="student-report-cover-label">Average age in class:</span>
        <span className="student-report-cover-value">{reportData.averageAgeInClass}</span>
      </div>
    </div>
  </section>
);

export const StudentReportObjectiveSection = ({ section }) => (
  <section className="student-report-course-section">
    <h3 className="student-report-course-heading">{section.title}</h3>
    <div className="student-report-table-wrapper">
      <table className="student-report-objectives-table">
        <thead>
          <tr>
            <th className="student-report-th">S. No.</th>
            <th className="student-report-th">Objective</th>
            <th className="student-report-th">Grade</th>
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td className="student-report-td student-report-td-num">{rowIdx + 1}</td>
              <td className="student-report-td student-report-td-objective">{row.objective}</td>
              <td className="student-report-td student-report-td-grade">{row.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export const StudentReportMarksheet = ({ reportData }) => (
  <section className="student-report-marksheet-section">
    <h2 className="student-report-marksheet-school-name">SAPLING HIGH SCHOOL (Registered)</h2>
    <h3 className="student-report-marksheet-heading">Annual Examination</h3>
    <div className="student-report-marksheet-table-wrapper">
      <table className="student-report-marksheet-table">
        <thead>
          <tr>
            <th className="student-report-marksheet-th">Subject</th>
            <th className="student-report-marksheet-th">Max. Marks</th>
            <th className="student-report-marksheet-th">Marks. Obtained</th>
            <th className="student-report-marksheet-th">Grade</th>
            <th className="student-report-marksheet-th">Highest Marks in Class</th>
          </tr>
        </thead>
        <tbody>
          {reportData.marksheetRows.map((row) => (
            <tr key={row.key}>
              <td className="student-report-marksheet-td">{row.label}</td>
              <td className="student-report-marksheet-td student-report-marksheet-td-num">{row.maxTotal ?? ''}</td>
              <td className="student-report-marksheet-td student-report-marksheet-td-num">{row.obtainedTotal ?? ''}</td>
              <td className="student-report-marksheet-td">{row.grade ?? ''}</td>
              <td className="student-report-marksheet-td student-report-marksheet-td-num">{row.highestInClass ?? ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="student-report-marksheet-total-row">
            <td className="student-report-marksheet-td"><strong>Total</strong></td>
            <td className="student-report-marksheet-td student-report-marksheet-td-num">{reportData.totalMax}</td>
            <td className="student-report-marksheet-td student-report-marksheet-td-num">{reportData.totalObtained}</td>
            <td className="student-report-marksheet-td" colSpan={2} />
          </tr>
          <tr className="student-report-marksheet-summary-row">
            <td className="student-report-marksheet-td" colSpan={3} />
            <td className="student-report-marksheet-td"><strong>Percentage</strong></td>
            <td className="student-report-marksheet-td student-report-marksheet-td-num" colSpan={2}>
              {reportData.totalPercentage}
            </td>
          </tr>
          {reportData.classPosition != null && (
            <tr className="student-report-marksheet-summary-row">
              <td className="student-report-marksheet-td" colSpan={3} />
              <td className="student-report-marksheet-td"><strong>Position</strong></td>
              <td className="student-report-marksheet-td student-report-marksheet-td-num" colSpan={2}>
                {reportData.classPosition}
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  </section>
);

export const StudentReportGradingScheme = ({ reportData }) => (
  <section className="student-report-grading-scheme-section">
    <h3 className="student-report-grading-scheme-heading">GRADING SCHEME</h3>
    {reportData.gradingSchemeRows.length === 0 ? (
      <p className="student-report-grading-scheme-empty">
        No grading scheme defined. You can define one from the Grading Scheme page in the menu.
      </p>
    ) : (
      <div className="student-report-grading-scheme-list">
        {formatGradingSchemeForDisplay(reportData.gradingSchemeRows).map((row, idx) => (
          <React.Fragment key={idx}>
            <div className="student-report-grading-scheme-row">
              <span className="student-report-grading-scheme-grade">{row.grade}</span>
              <span className="student-report-grading-scheme-pct">{row.percentageLabel}</span>
              <span className="student-report-grading-scheme-remark">{row.remark}</span>
            </div>
            {row.showGapAfter && <div className="student-report-grading-scheme-group-gap" aria-hidden="true" />}
          </React.Fragment>
        ))}
      </div>
    )}
  </section>
);

const StudentReportDocument = ({ reportData }) => {
  if (!reportData) return null;
  return (
    <div className="student-report-detail-content student-report-pdf-content">
      <StudentReportCover reportData={reportData} />

      {reportData.objectiveSections.length === 0 ? (
        <p className="student-report-detail-empty">No courses found in which this student is enrolled.</p>
      ) : (
        <div className="student-report-detail-sections">
          {reportData.objectiveSections.map((section, idx) => (
            <StudentReportObjectiveSection key={`${section.title}-${idx}`} section={section} />
          ))}
        </div>
      )}

      <StudentReportMarksheet reportData={reportData} />

      <StudentReportGradingScheme reportData={reportData} />
    </div>
  );
};

export default StudentReportDocument;
