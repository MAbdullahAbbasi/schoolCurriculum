import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { ROLE_LABELS } from './roleLabels';
import { IconAdd, IconCancel, IconDelete, IconSelectAll } from './ButtonIcons';
import { gradesFromStudents, sortStudentsByGrade } from './studentDataUtils';
import './StudentData.css';

const StudentDirectory = () => {
  const navigate = useNavigate();
  const [studentsData, setStudentsData] = useState([]);
  const [gradeFilter, setGradeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRegistrationNumbers, setSelectedRegistrationNumbers] = useState(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

  const gradesFromDb = useMemo(() => gradesFromStudents(studentsData), [studentsData]);

  const filteredStudents = useMemo(() => {
    const list = !gradeFilter
      ? studentsData
      : studentsData.filter((s) => String(s.grade) === String(gradeFilter));
    return sortStudentsByGrade(list);
  }, [studentsData, gradeFilter]);

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/students-data`);
      setStudentsData(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to fetch students data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsData();
  }, []);

  const openStudent = (registrationNumber) => {
    if (!registrationNumber || selectionMode) return;
    navigate(`/students-data/${encodeURIComponent(registrationNumber)}`);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL student records? This cannot be undone.')) return;
    try {
      setDeletingAll(true);
      const res = await axios.delete(`${API_URL}/api/students-data/all`);
      if (res.data.success) {
        await fetchStudentsData();
        setSelectionMode(false);
        setSelectedRegistrationNumbers(new Set());
      } else {
        alert(res.data.error || res.data.message || 'Failed to delete data.');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete data.');
    } finally {
      setDeletingAll(false);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) setSelectedRegistrationNumbers(new Set());
  };

  const toggleStudentSelection = (registrationNumber, e) => {
    e.stopPropagation();
    setSelectedRegistrationNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(registrationNumber)) next.delete(registrationNumber);
      else next.add(registrationNumber);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRegistrationNumbers(
        new Set(filteredStudents.map((s) => s.registrationNumber).filter(Boolean))
      );
    } else {
      setSelectedRegistrationNumbers(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    const regNums = Array.from(selectedRegistrationNumbers);
    if (regNums.length === 0) return;
    if (!window.confirm(`Delete ${regNums.length} selected student(s)? This cannot be undone.`)) return;
    try {
      setDeletingSelected(true);
      await axios.delete(`${API_URL}/api/students-data/selected`, {
        data: { registrationNumbers: regNums },
      });
      await fetchStudentsData();
      setSelectedRegistrationNumbers(new Set());
      setSelectionMode(false);
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to delete selected.');
    } finally {
      setDeletingSelected(false);
    }
  };

  if (loading && studentsData.length === 0) {
    return (
      <div className="student-data-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading {ROLE_LABELS.seedling.toLowerCase()} directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-data-container student-directory-page">
      <div className="student-directory-toolbar">
        <button
          type="button"
          className="student-directory-add-btn"
          onClick={() => navigate('/students-data/add')}
          aria-label={`Add ${ROLE_LABELS.seedling}`}
        >
          <span className="student-directory-add-icon" aria-hidden>
            <IconAdd />
          </span>
          <span className="student-directory-add-label">Add {ROLE_LABELS.seedling}</span>
        </button>
        <div className="student-directory-toolbar-actions">
          <div className="grade-filter-wrapper">
            <label htmlFor="student-data-grade-filter" className="grade-filter-label">
              Grade
            </label>
            <select
              id="student-data-grade-filter"
              className="grade-filter-select"
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
            >
              <option value="">All grades</option>
              {gradesFromDb.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>
          {studentsData.length > 0 && (
            <>
              <button
                type="button"
                className={selectionMode ? 'select-mode-btn active' : 'select-mode-btn'}
                onClick={toggleSelectionMode}
                disabled={deletingAll || deletingSelected}
              >
                <span className="btn-icon-wrap">
                  {selectionMode ? <><IconCancel />Cancel</> : <><IconSelectAll />Select</>}
                </span>
              </button>
              {selectionMode && (
                <button
                  type="button"
                  className="delete-selected-btn"
                  onClick={handleDeleteSelected}
                  disabled={selectedRegistrationNumbers.size === 0 || deletingSelected}
                >
                  <span className="btn-icon-wrap">
                    <IconDelete />
                    {deletingSelected ? 'Deleting...' : `Delete (${selectedRegistrationNumbers.size})`}
                  </span>
                </button>
              )}
              <button
                type="button"
                className="delete-all-btn"
                onClick={handleDeleteAll}
                disabled={deletingAll || deletingSelected || selectionMode}
              >
                <span className="btn-icon-wrap">
                  <IconDelete />
                  {deletingAll ? 'Deleting...' : 'Delete all'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {studentsData.length > 0 ? (
        <div className="students-table-section student-directory-section">
          <p className="student-directory-count">
            {filteredStudents.length} {ROLE_LABELS.seedling.toLowerCase()}
            {filteredStudents.length === 1 ? '' : 's'}
            {gradeFilter ? ` in grade ${gradeFilter}` : ''}
          </p>
          <div className="table-wrapper">
            <table className="students-table student-directory-table">
              <thead>
                <tr>
                  <th className="students-table-th-srno">Sr.</th>
                  {selectionMode && (
                    <th className="checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={
                          filteredStudents.length > 0 &&
                          filteredStudents.every((s) =>
                            selectedRegistrationNumbers.has(s.registrationNumber)
                          )
                        }
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </th>
                  )}
                  <th>Registration</th>
                  <th>Name</th>
                  <th>Grade</th>
                  <th className="student-directory-th-open" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => {
                  const reg = student.registrationNumber;
                  const isSelected = selectedRegistrationNumbers.has(reg);
                  return (
                    <tr
                      key={reg || index}
                      className={`student-directory-row ${isSelected ? 'student-directory-row--selected' : ''}`}
                      onClick={() => openStudent(reg)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openStudent(reg);
                        }
                      }}
                      tabIndex={selectionMode ? -1 : 0}
                      role={selectionMode ? undefined : 'button'}
                      aria-label={`Open ${student.studentName || reg}`}
                    >
                      <td className="students-table-td-srno">{index + 1}</td>
                      {selectionMode && (
                        <td className="checkbox-cell" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => toggleStudentSelection(reg, e)}
                            aria-label={`Select ${student.studentName}`}
                          />
                        </td>
                      )}
                      <td className="student-directory-reg">{reg || '—'}</td>
                      <td className="student-directory-name">{student.studentName || '—'}</td>
                      <td>{student.grade || '—'}</td>
                      <td className="student-directory-open" aria-hidden>
                        ›
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="empty-state student-directory-empty">
            <p>No {ROLE_LABELS.seedling.toLowerCase()}s yet.</p>
            <button type="button" className="add-student-btn" onClick={() => navigate('/students-data/add')}>
              <span className="btn-icon-wrap">
                <IconAdd />
                Add your first {ROLE_LABELS.seedling.toLowerCase()}
              </span>
            </button>
          </div>
        )
      )}
    </div>
  );
};

export default StudentDirectory;
