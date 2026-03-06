import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconDownload, IconView } from './ButtonIcons';
import './Reports.css';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const Reports = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handleViewReport = (student) => {
    navigate(`/reports/student/${encodeURIComponent(student.registrationNumber)}`, { state: { student } });
  };

  const studentsInGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const gradeStr = String(selectedGrade);
    return students
      .filter((s) => String(s.grade) === gradeStr)
      .sort((a, b) => {
        const nameA = (a.studentName || '').toLowerCase();
        const nameB = (b.studentName || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
      });
  }, [students, selectedGrade]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(`${API_URL}/api/students-data`);
        setStudents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, []);

  const triggerDownload = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadReport = (student) => {
    if (!student) return;
    const headers = ['Student Name', 'Registration Number', 'Grade'];
    const row = [
      student.studentName || '',
      student.registrationNumber || '',
      student.grade != null ? String(student.grade) : selectedGrade,
    ];
    const csvRows = [
      headers.join(','),
      row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
    ];
    const filename = `Grade_${selectedGrade}_${student.studentName}_${student.registrationNumber}.csv`.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    triggerDownload(filename, '\uFEFF' + csvRows.join('\r\n'));
  };

  const handleDownloadAllReports = () => {
    if (!selectedGrade || studentsInGrade.length === 0) return;
    const headers = ['Student Name', 'Registration Number', 'Grade'];
    const dataRows = studentsInGrade.map((student) =>
      [
        student.studentName || '',
        student.registrationNumber || '',
        student.grade != null ? String(student.grade) : selectedGrade,
      ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...dataRows].join('\r\n');
    const filename = `Grade_${selectedGrade}_All_Reports.csv`;
    triggerDownload(filename, csvContent);
  };

  if (loading) {
    return (
      <div className="reports-container">
        <CurriculumHeader />
        <div className="reports-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <CurriculumHeader />
        <div className="reports-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <CurriculumHeader />
      <div className="reports-content">
        <h2 className="reports-title">Reports</h2>
        <p className="reports-subtitle">Select a grade to view students and download reports.</p>

        <div className="reports-select-wrapper">
          <label htmlFor="reports-grade-select" className="reports-select-label">
            Grade
          </label>
          <select
            id="reports-grade-select"
            className="reports-select"
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
          >
            <option value="">Select a grade</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>

        {!selectedGrade && (
          <div className="reports-prompt">Please select a grade above to view students.</div>
        )}

        {selectedGrade && (
          <>
            <div className="reports-download-all-wrapper">
              <button
                type="button"
                className="reports-download-all-btn"
                onClick={handleDownloadAllReports}
                disabled={studentsInGrade.length === 0}
                title="Download all reports for this grade"
                aria-label="Download all reports for this grade"
              >
                <span className="btn-icon-wrap"><IconDownload />Download All Reports</span>
              </button>
            </div>
            <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th className="reports-th">Registration Number</th>
                  <th className="reports-th">Name</th>
                  <th className="reports-th reports-th-action">Action</th>
                  <th className="reports-th reports-th-report">Report.</th>
                </tr>
              </thead>
              <tbody>
                {studentsInGrade.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="reports-empty-cell">
                      No students in Grade {selectedGrade}.
                    </td>
                  </tr>
                ) : (
                  studentsInGrade.map((student) => (
                    <tr key={student.registrationNumber}>
                      <td className="reports-td">{student.registrationNumber}</td>
                      <td className="reports-td">{student.studentName}</td>
                      <td className="reports-td reports-td-action">
                        <button
                          type="button"
                          className="reports-view-btn"
                          onClick={() => handleViewReport(student)}
                          title={`View report for ${student.studentName}`}
                          aria-label={`View report for ${student.studentName}`}
                        >
                          <span className="btn-icon-wrap"><IconView />View</span>
                        </button>
                      </td>
                      <td className="reports-td reports-td-report">
                        <button
                          type="button"
                          className="reports-download-btn"
                          onClick={() => handleDownloadReport(student)}
                          title={`Download report for ${student.studentName}`}
                          aria-label={`Download report for ${student.studentName}`}
                        >
                          <span className="btn-icon-wrap"><IconDownload />Download</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
