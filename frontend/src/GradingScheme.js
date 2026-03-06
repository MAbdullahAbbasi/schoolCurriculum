import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconAdd, IconCancel, IconClose, IconCreate, IconDelete, IconEdit, IconRemove, IconSave } from './ButtonIcons';
import './GradingScheme.css';

const STORAGE_KEY = 'curriculum_grading_scheme';

const saveToStorage = (rows) => {
  try {
    const toSave = rows.map((r) => ({ percentage: r.percentage, grade: r.grade }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (_) {}
};

let nextRowId = 1;
const newRow = () => ({ id: nextRowId++, percentage: '', grade: '' });
const rowFromData = (data) => ({ id: nextRowId++, percentage: data.percentage ?? data.marks ?? '', grade: data.grade ?? '' });

const GradingScheme = () => {
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingScheme, setEditingScheme] = useState(null); // null = none, {} = create new, { ... } = edit existing
  const [form, setForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    rows: [newRow()],
  });
  const [saving, setSaving] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const isEditingExisting = useMemo(() => !!(editingScheme && editingScheme._id), [editingScheme]);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/grading-schemes`);
      if (res.data?.success) {
        setSchemes(res.data.data || []);
      } else {
        setError(res.data?.message || 'Failed to fetch grading schemes');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to fetch grading schemes';
      setError(msg);
      setSchemes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchemes();
  }, []);

  const openCreate = () => {
    setEditingScheme({});
    nextRowId = 1;
    setForm({
      name: '',
      startDate: '',
      endDate: '',
      rows: [newRow()],
    });
    setError(null);
  };

  const openEdit = (scheme) => {
    setEditingScheme(scheme);
    nextRowId = 1;
    setForm({
      name: scheme.name || '',
      startDate: scheme.startDate ? String(scheme.startDate).slice(0, 10) : '',
      endDate: scheme.endDate ? String(scheme.endDate).slice(0, 10) : '',
      rows: Array.isArray(scheme.rows) && scheme.rows.length > 0
        ? scheme.rows.map((r) => rowFromData(r))
        : [newRow()],
    });
    setError(null);
  };

  const closeEditor = () => {
    setEditingScheme(null);
    setForm({ name: '', startDate: '', endDate: '', rows: [newRow()] });
    setSaving(false);
  };

  const updateFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addRow = () => {
    setForm((prev) => ({ ...prev, rows: [...prev.rows, newRow()] }));
  };

  const updateRow = (id, field, value) => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    }));
  };

  const removeRow = (id) => {
    setForm((prev) => ({
      ...prev,
      rows: prev.rows.filter((r) => r.id !== id),
    }));
  };

  const handleSave = async () => {
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError('Start date and end date are required.');
      return;
    }
    const validRows = form.rows
      .map((r) => ({ percentage: (r.percentage ?? '').trim(), grade: (r.grade ?? '').trim() }))
      .filter((r) => r.percentage !== '' && r.grade !== '');
    if (validRows.length === 0) {
      setError('At least one percentage/grade row is required.');
      return;
    }
    const hasInvalidPercentage = validRows.some((r) => {
      const value = Number(r.percentage);
      return !Number.isFinite(value) || value < 0 || value > 100;
    });
    if (hasInvalidPercentage) {
      setError('Percentage must be between 0 and 100.');
      return;
    }

    const payload = {
      name: trimmedName,
      startDate: form.startDate,
      endDate: form.endDate,
      rows: validRows,
    };

    try {
      setSaving(true);
      setError(null);
      let res;
      if (isEditingExisting) {
        res = await axios.put(`${API_URL}/api/grading-schemes/${editingScheme._id}`, payload, {
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        res = await axios.post(`${API_URL}/api/grading-schemes`, payload, {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (res.data?.success) {
        // Keep backward compatibility: save latest scheme to localStorage for reports page
        saveToStorage(validRows);
        await fetchSchemes();
        closeEditor();
      } else {
        setError(res.data?.message || 'Failed to save grading scheme.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to save grading scheme.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this grading scheme? This cannot be undone.')) return;
    try {
      setDeletingId(id);
      setError(null);
      await axios.delete(`${API_URL}/api/grading-schemes/${id}`);
      await fetchSchemes();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete grading scheme.';
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL grading schemes? This cannot be undone.')) return;
    try {
      setDeletingAll(true);
      setError(null);
      await axios.delete(`${API_URL}/api/grading-schemes`);
      await fetchSchemes();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete grading schemes.';
      setError(msg);
    } finally {
      setDeletingAll(false);
    }
  };

  const formatDateDisplay = (d) => {
    if (!d) return '-';
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const monthLabel = (start, end) => {
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '';
    const sMonth = s.toLocaleString('default', { month: 'short' }).toLowerCase();
    const eMonth = e.toLocaleString('default', { month: 'short' }).toLowerCase();
    if (sMonth === eMonth) return sMonth;
    return `${sMonth}-${eMonth}`;
  };

  return (
    <div className="grading-scheme-container">
      <CurriculumHeader />
      <div className="grading-scheme-content">
        <h2 className="grading-scheme-title">Grading Scheme</h2>
        <p className="grading-scheme-subtitle">
          Create grading schemes with validity periods. Each scheme defines how percentage maps to grades.
        </p>

        {error && (
          <div className="grading-scheme-error" role="alert">
            {error}
          </div>
        )}

        <div className="grading-scheme-actions">
          <button
            type="button"
            className="grading-scheme-create-btn"
            onClick={openCreate}
          >
            <span className="btn-icon-wrap"><IconCreate />+ Create grading scheme</span>
          </button>
          {schemes.length > 0 && (
            <button
              type="button"
              className="grading-scheme-delete-all-btn"
              onClick={handleDeleteAll}
              disabled={deletingAll}
            >
              <span className="btn-icon-wrap"><IconDelete />{deletingAll ? 'Deleting...' : 'Delete all'}</span>
            </button>
          )}
        </div>

        {loading ? (
          <p className="grading-scheme-loading">Loading grading schemes...</p>
        ) : schemes.length > 0 ? (
          <div className="grading-scheme-list-wrapper">
            <table className="grading-scheme-list-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Start date</th>
                  <th>End date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schemes.map((s) => (
                  <tr key={s._id}>
                    <td>{s.name || monthLabel(s.startDate, s.endDate) || '-'}</td>
                    <td>{formatDateDisplay(s.startDate)}</td>
                    <td>{formatDateDisplay(s.endDate)}</td>
                    <td className="grading-scheme-actions-cell">
                      <button
                        type="button"
                        className="grading-scheme-row-edit-btn"
                        onClick={() => openEdit(s)}
                      >
                        <span className="btn-icon-wrap"><IconEdit />Edit</span>
                      </button>
                      <button
                        type="button"
                        className="grading-scheme-row-delete-btn"
                        onClick={() => handleDelete(s._id)}
                        disabled={deletingId === s._id}
                      >
                        <span className="btn-icon-wrap"><IconDelete />{deletingId === s._id ? 'Deleting...' : 'Delete'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !loading && <p className="grading-scheme-empty">No grading schemes yet. Create one above.</p>
        )}

        {editingScheme && (
          <>
            <div
              className="grading-scheme-overlay"
              onClick={closeEditor}
              role="button"
              aria-label="Close grading scheme editor"
            />
            <div className="grading-scheme-editor" role="dialog" aria-modal="true">
              <div className="grading-scheme-editor-header">
                <h3>{isEditingExisting ? 'Edit grading scheme' : 'Create grading scheme'}</h3>
                <button
                  type="button"
                  className="grading-scheme-editor-close-btn"
                  onClick={closeEditor}
                  aria-label="Close"
                >
                  <span className="btn-icon-wrap"><IconClose />Close</span>
                </button>
              </div>

              <div className="grading-scheme-editor-body">
                <div className="grading-scheme-editor-grid">
                  <div className="grading-scheme-editor-field">
                    <label className="grading-scheme-editor-label">Name (e.g. Feb–Mar 2026)</label>
                    <input
                      className="grading-scheme-input"
                      value={form.name}
                      onChange={(e) => updateFormField('name', e.target.value)}
                    />
                  </div>
                  <div className="grading-scheme-editor-field">
                    <label className="grading-scheme-editor-label">Start date</label>
                    <input
                      type="date"
                      className="grading-scheme-input"
                      value={form.startDate}
                      onChange={(e) => updateFormField('startDate', e.target.value)}
                    />
                  </div>
                  <div className="grading-scheme-editor-field">
                    <label className="grading-scheme-editor-label">End date</label>
                    <input
                      type="date"
                      className="grading-scheme-input"
                      value={form.endDate}
                      onChange={(e) => updateFormField('endDate', e.target.value)}
                    />
                  </div>
                </div>

                <p className="grading-scheme-subtitle">
                  Define how percentage maps to grades for this scheme.
                </p>

                <div className="grading-scheme-table-wrapper">
                  <table className="grading-scheme-table">
                    <thead>
                      <tr>
                        <th className="grading-scheme-th">Percentage</th>
                        <th className="grading-scheme-th">Grade</th>
                        <th className="grading-scheme-th" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="grading-scheme-td">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              inputMode="decimal"
                              className="grading-scheme-input"
                              placeholder="e.g. 90"
                              value={row.percentage}
                              onChange={(e) => updateRow(row.id, 'percentage', e.target.value)}
                              aria-label="Percentage"
                            />
                          </td>
                          <td className="grading-scheme-td">
                            <input
                              type="text"
                              className="grading-scheme-input"
                              placeholder="e.g. A+"
                              value={row.grade}
                              onChange={(e) => updateRow(row.id, 'grade', e.target.value)}
                              aria-label="Grade"
                            />
                          </td>
                          <td className="grading-scheme-td grading-scheme-td-remove">
                            <button
                              type="button"
                              className="grading-scheme-remove-row-btn"
                              onClick={() => removeRow(row.id)}
                            >
                              <span className="btn-icon-wrap"><IconRemove />Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  type="button"
                  className="grading-scheme-add-btn"
                  onClick={addRow}
                >
                  <span className="btn-icon-wrap"><IconAdd />Add row</span>
                </button>
              </div>

              <div className="grading-scheme-editor-footer">
                <button
                  type="button"
                  className="grading-scheme-cancel-btn"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  <span className="btn-icon-wrap"><IconCancel />Cancel</span>
                </button>
                <button
                  type="button"
                  className="grading-scheme-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <span className="btn-icon-wrap"><IconSave />{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GradingScheme;
