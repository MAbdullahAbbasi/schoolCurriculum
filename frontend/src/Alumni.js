import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { IconBack } from './ButtonIcons';
import { currentPassedOutYear } from './studentDataUtils';
import './StudentData.css';

const Alumni = () => {
  const navigate = useNavigate();
  const [years, setYears] = useState([]);
  const [year, setYear] = useState('');
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchYears = async () => {
    const res = await axios.get(`${API_URL}/api/students-data/alumni/years`);
    const list = Array.isArray(res.data?.data) ? res.data.data : [];
    setYears(list);
    return list;
  };

  const fetchAlumni = async (selectedYear) => {
    const params = selectedYear ? { year: selectedYear } : {};
    const res = await axios.get(`${API_URL}/api/students-data/alumni`, { params });
    setAlumni(Array.isArray(res.data?.data) ? res.data.data : []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const list = await fetchYears();
        const initial = list.includes(currentPassedOutYear())
          ? String(currentPassedOutYear())
          : list[0] != null
            ? String(list[0])
            : '';
        setYear(initial);
        await fetchAlumni(initial);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load alumni.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleYearChange = async (nextYear) => {
    setYear(nextYear);
    try {
      setLoading(true);
      await fetchAlumni(nextYear);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to load alumni.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="student-data-container student-directory-page">
      <button
        type="button"
        className="student-page-back-btn"
        onClick={() => navigate('/students-data')}
      >
        <span className="btn-icon-wrap">
          <IconBack />
          Back to seedlings
        </span>
      </button>

      {error && <div className="error-message">{error}</div>}

      <div className="student-directory-toolbar">
        <div className="grade-filter-wrapper">
          <label htmlFor="alumni-year-filter" className="grade-filter-label">
            Year passed out
          </label>
          <select
            id="alumni-year-filter"
            className="grade-filter-select"
            value={year}
            onChange={(e) => handleYearChange(e.target.value)}
            disabled={years.length === 0}
          >
            {years.length === 0 ? (
              <option value="">No years yet</option>
            ) : (
              years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {loading && alumni.length === 0 ? (
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading alumni...</p>
        </div>
      ) : alumni.length > 0 ? (
        <div className="students-table-section student-directory-section">
          <p className="student-directory-count">
            {alumni.length} alumn{alumni.length === 1 ? 'us' : 'i'}
            {year ? ` who passed out in ${year}` : ''}
          </p>
          <div className="table-wrapper">
            <table className="students-table student-directory-table">
              <thead>
                <tr>
                  <th className="students-table-th-srno">Sr.</th>
                  <th>Registration</th>
                  <th>Name</th>
                  <th>Father's name</th>
                  <th>Grade</th>
                  <th>Subject</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {alumni.map((student, index) => (
                  <tr key={student.registrationNumber || index}>
                    <td className="students-table-td-srno">{index + 1}</td>
                    <td className="student-directory-reg">{student.registrationNumber || '—'}</td>
                    <td className="student-directory-name">{student.studentName || '—'}</td>
                    <td>{student.fathersName || '—'}</td>
                    <td>{student.grade || '—'}</td>
                    <td>{student.subject || '—'}</td>
                    <td>{student.passedOutYear || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="empty-state student-directory-empty">
            <p>
              {years.length === 0
                ? 'No alumni yet. Pass out Class 10 students from Promote to add them here.'
                : `No alumni found for ${year}.`}
            </p>
          </div>
        )
      )}
    </div>
  );
};

export default Alumni;
