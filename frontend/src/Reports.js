import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './Reports.css';

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const downloadIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

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
                          View
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
                          {downloadIcon}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
