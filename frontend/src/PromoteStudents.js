import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { ROLE_LABELS } from './roleLabels';
import { IconBack, IconPromote } from './ButtonIcons';
import {
  formatGradeDisplay,
  formatGradeOptionLabel,
  getNextGrade,
  gradesFromStudents,
  gradesMatch,
  normalizeGradeForMatch,
} from './studentDataUtils';
import './StudentData.css';

const PromoteStudents = () => {
  const navigate = useNavigate();
  const [studentsData, setStudentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [classGrade, setClassGrade] = useState('');
  const [promotingClass, setPromotingClass] = useState(false);
  const [sourceGrade, setSourceGrade] = useState('');
  const [selectedRegistrationNumbers, setSelectedRegistrationNumbers] = useState(new Set());
  const [promotingSelected, setPromotingSelected] = useState(false);

  const gradesFromDb = useMemo(() => gradesFromStudents(studentsData), [studentsData]);

  const studentsInClass = useMemo(() => {
    if (!classGrade) return [];
    return studentsData.filter((s) => gradesMatch(s.grade, classGrade));
  }, [studentsData, classGrade]);

  const studentsInSourceClass = useMemo(() => {
    if (!sourceGrade) return [];
    return studentsData.filter((s) => gradesMatch(s.grade, sourceGrade));
  }, [studentsData, sourceGrade]);

  const classNextGrade = classGrade ? getNextGrade(classGrade) : null;
  const sourceNextGrade = sourceGrade ? getNextGrade(sourceGrade) : null;

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/students-data`);
      setStudentsData(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to fetch students data'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentsData();
  }, []);

  const handlePromoteClass = async () => {
    if (!classGrade) {
      alert('Select a class first.');
      return;
    }
    if (!classNextGrade) {
      alert('This class is already at the highest grade.');
      return;
    }
    const label = formatGradeDisplay(normalizeGradeForMatch(classGrade));
    const nextLabel = formatGradeDisplay(classNextGrade);
    if (
      !window.confirm(
        `Promote all ${studentsInClass.length} student(s) in ${label} to ${nextLabel}?`
      )
    ) {
      return;
    }
    try {
      setPromotingClass(true);
      const res = await axios.post(`${API_URL}/api/students-data/promote`, {
        mode: 'class',
        grade: classGrade,
      });
      alert(res.data.message || 'Promotion complete.');
      await fetchStudentsData();
      setClassGrade('');
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to promote class.'
      );
    } finally {
      setPromotingClass(false);
    }
  };

  const toggleStudentSelection = (registrationNumber) => {
    setSelectedRegistrationNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(registrationNumber)) next.delete(registrationNumber);
      else next.add(registrationNumber);
      return next;
    });
  };

  const handleSelectAllInSource = (checked) => {
    if (checked) {
      setSelectedRegistrationNumbers(
        new Set(studentsInSourceClass.map((s) => s.registrationNumber).filter(Boolean))
      );
    } else {
      setSelectedRegistrationNumbers(new Set());
    }
  };

  const handlePromoteSelected = async () => {
    if (!sourceGrade) {
      alert('Select the class your students are in.');
      return;
    }
    if (!sourceNextGrade) {
      alert('This class is already at the highest grade.');
      return;
    }
    const regNums = Array.from(selectedRegistrationNumbers);
    if (regNums.length === 0) {
      alert('Select at least one student.');
      return;
    }
    const nextLabel = formatGradeDisplay(sourceNextGrade);
    if (
      !window.confirm(
        `Promote ${regNums.length} selected student(s) to ${nextLabel}?`
      )
    ) {
      return;
    }
    try {
      setPromotingSelected(true);
      const res = await axios.post(`${API_URL}/api/students-data/promote`, {
        mode: 'selected',
        sourceGrade,
        registrationNumbers: regNums,
      });
      alert(res.data.message || 'Promotion complete.');
      await fetchStudentsData();
      setSelectedRegistrationNumbers(new Set());
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to promote selected students.'
      );
    } finally {
      setPromotingSelected(false);
    }
  };

  if (loading && studentsData.length === 0) {
    return (
      <div className="student-data-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-data-container student-promote-page">
      <button
        type="button"
        className="student-page-back-btn"
        onClick={() => navigate('/students-data')}
      >
        <span className="btn-icon-wrap">
          <IconBack />
          Back to directory
        </span>
      </button>

      {error && <div className="error-message">{error}</div>}

      <section className="promote-section">
        <h3 className="add-student-title">Promote entire class</h3>
        <p className="promote-section-hint">
          Choose a class; every {ROLE_LABELS.seedling.toLowerCase()} in that class moves up one
          grade.
        </p>
        <div className="promote-controls">
          <div className="grade-filter-wrapper">
            <label htmlFor="promote-class-grade" className="grade-filter-label">
              Class
            </label>
            <select
              id="promote-class-grade"
              className="grade-filter-select"
              value={classGrade}
              onChange={(e) => setClassGrade(e.target.value)}
              disabled={promotingClass}
            >
              <option value="">Select class</option>
              {gradesFromDb.map((g) => (
                <option key={g} value={g}>
                  {formatGradeOptionLabel(g)}
                </option>
              ))}
            </select>
          </div>
          {classGrade && (
            <p className="promote-target-hint">
              {studentsInClass.length} student(s) →{' '}
              {classNextGrade
                ? formatGradeDisplay(classNextGrade)
                : 'Cannot promote (highest grade)'}
            </p>
          )}
          <button
            type="button"
            className="promote-action-btn"
            onClick={handlePromoteClass}
            disabled={
              !classGrade || !classNextGrade || studentsInClass.length === 0 || promotingClass
            }
          >
            <span className="btn-icon-wrap">
              <IconPromote />
              {promotingClass ? 'Promoting...' : 'Promote class'}
            </span>
          </button>
        </div>
      </section>

      <section className="promote-section">
        <h3 className="add-student-title">Promote selected students</h3>
        <p className="promote-section-hint">
          Pick the class they are in, select one or more students, then promote them to the next
          grade only.
        </p>
        <div className="promote-controls">
          <div className="grade-filter-wrapper">
            <label htmlFor="promote-source-grade" className="grade-filter-label">
              Class
            </label>
            <select
              id="promote-source-grade"
              className="grade-filter-select"
              value={sourceGrade}
              onChange={(e) => {
                setSourceGrade(e.target.value);
                setSelectedRegistrationNumbers(new Set());
              }}
              disabled={promotingSelected}
            >
              <option value="">Select class</option>
              {gradesFromDb.map((g) => (
                <option key={g} value={g}>
                  {formatGradeOptionLabel(g)}
                </option>
              ))}
            </select>
          </div>
          {sourceGrade && sourceNextGrade && (
            <p className="promote-target-hint">
              Promotes to {formatGradeDisplay(sourceNextGrade)}
            </p>
          )}
        </div>

        {sourceGrade && studentsInSourceClass.length > 0 ? (
          <>
            <div className="table-wrapper promote-select-table">
              <table className="students-table">
                <thead>
                  <tr>
                    <th className="checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label="Select all in class"
                        checked={
                          studentsInSourceClass.length > 0 &&
                          studentsInSourceClass.every((s) =>
                            selectedRegistrationNumbers.has(s.registrationNumber)
                          )
                        }
                        onChange={(e) => handleSelectAllInSource(e.target.checked)}
                      />
                    </th>
                    <th>Registration</th>
                    <th>Name</th>
                    <th>Current grade</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsInSourceClass.map((student) => (
                    <tr key={student.registrationNumber}>
                      <td className="checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedRegistrationNumbers.has(
                            student.registrationNumber
                          )}
                          onChange={() =>
                            toggleStudentSelection(student.registrationNumber)
                          }
                          aria-label={`Select ${student.studentName}`}
                        />
                      </td>
                      <td>{student.registrationNumber}</td>
                      <td>{student.studentName}</td>
                      <td>{student.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="promote-action-btn"
              onClick={handlePromoteSelected}
              disabled={
                selectedRegistrationNumbers.size === 0 ||
                !sourceNextGrade ||
                promotingSelected
              }
            >
              <span className="btn-icon-wrap">
                <IconPromote />
                {promotingSelected
                  ? 'Promoting...'
                  : `Promote selected (${selectedRegistrationNumbers.size})`}
              </span>
            </button>
          </>
        ) : (
          sourceGrade && (
            <p className="promote-empty-class">No students in this class.</p>
          )
        )}
      </section>
    </div>
  );
};

export default PromoteStudents;
