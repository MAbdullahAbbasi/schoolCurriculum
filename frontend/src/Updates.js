import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from './config/api';
import './Updates.css';

function formatDateTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return String(value);
  }
}

export default function Updates() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const loadUpdates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      // GET /api/updates automatically syncs recent GitHub pushes before returning.
      const res = await axios.get(`${API_URL}/api/updates`, { params });
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setRows([]);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to load updates.'
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    loadUpdates();
  }, [loadUpdates]);

  const handleClearFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="updates-page">
      <h1 className="updates-heading">Updates</h1>

      <form
        className="updates-filters"
        onSubmit={(e) => {
          e.preventDefault();
          loadUpdates();
        }}
      >
        <label className="updates-filter-field">
          Date from
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
        </label>
        <label className="updates-filter-field">
          Date to
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </label>
        <div className="updates-filter-actions">
          <button type="submit" className="updates-btn updates-btn--primary">
            Apply filter
          </button>
          <button
            type="button"
            className="updates-btn updates-btn--ghost"
            onClick={handleClearFilters}
          >
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <p className="updates-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="updates-status">Loading updates…</p>
      ) : rows.length === 0 ? (
        <p className="updates-status">
          No updates found for this date range. Try clearing the filter.
        </p>
      ) : (
        <div className="updates-table-wrap">
          <table className="updates-table">
            <thead>
              <tr>
                <th scope="col">S.No.</th>
                <th scope="col">Date &amp; time</th>
                <th scope="col">Update message</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id || row.commitSha}>
                  <td className="updates-col-serial">{row.serialNumber}</td>
                  <td className="updates-col-date">{formatDateTime(row.committedAt)}</td>
                  <td className="updates-col-message">
                    <p>{row.message}</p>
                    {row.authorName ? (
                      <span className="updates-meta">By {row.authorName}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
