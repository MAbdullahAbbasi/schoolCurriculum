import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconDelete, IconEdit } from './ButtonIcons';
import './Educators.css';

const GRADES = ['KG-II', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

// Subject list (matches the subjects used in existing reports/result sheet).
const SUBJECTS = [
  'Urdu',
  'English',
  'Math',
  'Science',
  'Social Studies',
  'Computer',
  'Tarjuma Tul Quran',
  'TQ',
  'Islamiat',
  'Nazra',
  'Art',
];

const Educators = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(() => new Set());

  const [showAddCard, setShowAddCard] = useState(false);
  const [addStage, setAddStage] = useState('form'); // form | confirmAdmin
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addGrade, setAddGrade] = useState('KG-II');
  const [addSubject, setAddSubject] = useState(SUBJECTS[0] || '');
  const [addPairs, setAddPairs] = useState([]);
  const [addAdminPassword, setAddAdminPassword] = useState('');

  const [showEditCard, setShowEditCard] = useState(false);
  const [editStage, setEditStage] = useState('form'); // form | confirmAdmin
  const [editTargetUsername, setEditTargetUsername] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editGrade, setEditGrade] = useState('KG-II');
  const [editSubject, setEditSubject] = useState(SUBJECTS[0] || '');
  const [editPairs, setEditPairs] = useState([]);
  const [editAdminPassword, setEditAdminPassword] = useState('');

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/educators`);
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setError('Failed to load educators.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logoutAndReload = () => {
    localStorage.removeItem('curriculum_auth');
    window.location.reload();
  };

  const toggleAll = (checked) => {
    if (!checked) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(rows.map((r) => r.username).filter(Boolean)));
  };

  const toggleOne = (username, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(username);
      else next.delete(username);
      return next;
    });
  };

  const maskPassword = (_value) => '********';

  const addCurrentPairToList = () => {
    setError(null);
    const grade = String(addGrade || '').trim();
    const subject = String(addSubject || '').trim();
    if (!grade || !subject) {
      setError('Select both Grade and Subject.');
      return;
    }

    setAddPairs((prev) => {
      const exists = prev.some((p) => String(p.grade) === grade && String(p.subject) === subject);
      if (exists) return prev;
      return [...prev, { grade, subject }];
    });
  };

  const removePairAtIndex = (idx, kind) => {
    if (kind === 'add') {
      setAddPairs((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setEditPairs((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  const addCurrentEditPairToList = () => {
    setError(null);
    const grade = String(editGrade || '').trim();
    const subject = String(editSubject || '').trim();
    if (!grade || !subject) {
      setError('Select both Grade and Subject.');
      return;
    }

    setEditPairs((prev) => {
      const exists = prev.some((p) => String(p.grade) === grade && String(p.subject) === subject);
      if (exists) return prev;
      return [...prev, { grade, subject }];
    });
  };

  const deleteAll = async () => {
    setError(null);
    try {
      const usernames = Array.from(selected);
      const hasSelection = usernames.length > 0;
      const ok = window.confirm(
        hasSelection ? `Delete ${usernames.length} selected educator(s)?` : 'Delete ALL educators?'
      );
      if (!ok) return;

      if (hasSelection) {
        await axios.post(`${API_URL}/api/admin/educators/bulk-delete`, { usernames });
      } else {
        await axios.delete(`${API_URL}/api/admin/educators/all`);
      }

      setSelected(new Set());
      await fetchRows();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const openAdd = () => {
    setShowAddCard(true);
    setAddStage('form');
    setAddUsername('');
    setAddPassword('');
    setAddGrade('KG-II');
    setAddSubject(SUBJECTS[0] || '');
    setAddPairs([]);
    setAddAdminPassword('');
  };

  const closeCards = () => {
    setShowAddCard(false);
    setShowEditCard(false);
    setAddStage('form');
    setEditStage('form');
    setAddAdminPassword('');
    setEditAdminPassword('');
    setAddPairs([]);
    setEditPairs([]);
  };

  const submitAdd = () => {
    setError(null);
    if (!addUsername.trim() || !addPassword.trim()) {
      setError('Username and password are required.');
      return;
    }
    const effectiveAssignments =
      Array.isArray(addPairs) && addPairs.length > 0 ? addPairs : [{ grade: addGrade, subject: addSubject }];
    if (!Array.isArray(effectiveAssignments) || effectiveAssignments.length === 0) {
      setError('Please select Grade and Subject.');
      return;
    }
    setAddStage('confirmAdmin');
  };

  const confirmAdd = async () => {
    setError(null);
    try {
      const effectiveAssignments =
        Array.isArray(addPairs) && addPairs.length > 0 ? addPairs : [{ grade: addGrade, subject: addSubject }];
      if (!effectiveAssignments[0]?.grade || !effectiveAssignments[0]?.subject) {
        setError('Please select Grade and Subject.');
        return;
      }
      const payload = {
        username: addUsername.trim(),
        password: addPassword,
        assignments: effectiveAssignments,
        adminPassword: addAdminPassword,
      };
      await axios.post(`${API_URL}/api/admin/educators`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      closeCards();
      setSelected(new Set());
      await fetchRows();
    } catch (err) {
      if (err.response?.status === 403) {
        logoutAndReload();
        return;
      }
      setError(err.response?.data?.message || 'Failed to create educator.');
    }
  };

  const openEdit = (row) => {
    setShowEditCard(true);
    setEditStage('form');
    setEditTargetUsername(row.username);
    setEditUsername(row.username);
    setEditPassword('');
    const assignments = Array.isArray(row.assignments) ? row.assignments : [];
    setEditPairs(assignments);
    const first = assignments[0];
    setEditGrade(first?.grade || 'KG-II');
    setEditSubject(first?.subject || (SUBJECTS[0] || ''));
    setEditAdminPassword('');
  };

  const submitEdit = () => {
    setError(null);
    if (!editUsername.trim()) {
      setError('Username is required.');
      return;
    }
    setEditStage('confirmAdmin');
  };

  const confirmEdit = async () => {
    setError(null);
    try {
      const effectiveAssignments =
        Array.isArray(editPairs) && editPairs.length > 0 ? editPairs : [{ grade: editGrade, subject: editSubject }];
      if (!effectiveAssignments[0]?.grade || !effectiveAssignments[0]?.subject) {
        setError('Please select Grade and Subject.');
        return;
      }
      const payload = {
        newUsername: editUsername.trim(),
        password: editPassword.trim() ? editPassword : undefined,
        assignments: effectiveAssignments,
        adminPassword: editAdminPassword,
      };
      await axios.put(`${API_URL}/api/admin/educators/${encodeURIComponent(editTargetUsername)}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      closeCards();
      setSelected(new Set());
      await fetchRows();
    } catch (err) {
      if (err.response?.status === 403) {
        logoutAndReload();
        return;
      }
      setError(err.response?.data?.message || 'Failed to update educator.');
    }
  };

  const deleteSingle = async (username) => {
    setError(null);
    const ok = window.confirm(`Delete educator "${username}"?`);
    if (!ok) return;
    try {
      await axios.delete(`${API_URL}/api/admin/educators/${encodeURIComponent(username)}`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
      await fetchRows();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete.');
    }
  };

  const allChecked = useMemo(() => rows.length > 0 && rows.every((r) => selected.has(r.username)), [rows, selected]);

  if (loading) {
    return (
      <div className="educators-container">
        <CurriculumHeader />
        <div className="educators-content">
          <div className="loading-spinner">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="educators-container">
      <CurriculumHeader />
      <div className="educators-content">
        <h2 className="educators-title">Educators</h2>
        {error && <div className="educators-error">{error}</div>}

        {(showAddCard || showEditCard) && (
          <div className="educators-modal-wrap">
            {showAddCard && (
              <div className="educators-modal-card">
                <h3 className="educators-modal-title">Add Educator</h3>

                {addStage === 'form' && (
                  <>
                    <label className="educators-label">
                      Username
                      <input className="educators-input" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} />
                    </label>
                    <label className="educators-label">
                      Password
                      <input
                        className="educators-input"
                        type="password"
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                      />
                    </label>
                    <label className="educators-label">
                      Grade
                      <select className="educators-input" value={addGrade} onChange={(e) => setAddGrade(e.target.value)}>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g === 'KG-II' ? 'KG-II' : g}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="educators-label">
                      Subject
                      <select className="educators-input" value={addSubject} onChange={(e) => setAddSubject(e.target.value)}>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="educators-modal-actions" style={{ justifyContent: 'space-between' }}>
                      <button type="button" className="btn-secondary" onClick={addCurrentPairToList}>
                        Add Grade+Subject
                      </button>
                    </div>

                    {addPairs.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontWeight: 900, marginBottom: '0.5rem', color: '#2c3e50' }}>
                          Assignments ({addPairs.length})
                        </div>
                        <div>
                          {addPairs.map((p, idx) => (
                            <div key={`${p.grade}-${p.subject}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.45rem 0.65rem', border: '1px solid #e0e0e0', borderRadius: '10px', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: '#2c3e50' }}>
                                {p.grade} - {p.subject}
                              </span>
                              <button type="button" className="btn-danger" style={{ padding: '0.35rem 0.6rem' }} onClick={() => removePairAtIndex(idx, 'add')}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="educators-modal-actions">
                      <button type="button" className="btn-secondary" onClick={closeCards}>
                        Cancel
                      </button>
                      <button type="button" className="btn-primary" onClick={submitAdd}>
                        Submit
                      </button>
                    </div>
                  </>
                )}

                {addStage === 'confirmAdmin' && (
                  <>
                    <p className="educators-hint">
                      Enter your admin password to confirm authenticity. If it is wrong, you will be logged out.
                    </p>
                    <label className="educators-label">
                      Admin Password
                      <input
                        className="educators-input"
                        type="password"
                        value={addAdminPassword}
                        onChange={(e) => setAddAdminPassword(e.target.value)}
                      />
                    </label>
                    <div className="educators-modal-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setAddStage('form');
                          setAddAdminPassword('');
                        }}
                      >
                        Back
                      </button>
                      <button type="button" className="btn-primary" onClick={confirmAdd}>
                        Confirm
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {showEditCard && (
              <div className="educators-modal-card">
                <h3 className="educators-modal-title">Edit Educator</h3>

                {editStage === 'form' && (
                  <>
                    <label className="educators-label">
                      Username
                      <input className="educators-input" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                    </label>
                    <label className="educators-label">
                      New Password (optional)
                      <input
                        className="educators-input"
                        type="password"
                        placeholder="Leave blank to keep"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                      />
                    </label>
                    <label className="educators-label">
                      Grade
                      <select className="educators-input" value={editGrade} onChange={(e) => setEditGrade(e.target.value)}>
                        {GRADES.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="educators-label">
                      Subject
                      <select className="educators-input" value={editSubject} onChange={(e) => setEditSubject(e.target.value)}>
                        {SUBJECTS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div className="educators-modal-actions" style={{ justifyContent: 'space-between' }}>
                      <button type="button" className="btn-secondary" onClick={addCurrentEditPairToList}>
                        Add Grade+Subject
                      </button>
                    </div>

                    {editPairs.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontWeight: 900, marginBottom: '0.5rem', color: '#2c3e50' }}>
                          Assignments ({editPairs.length})
                        </div>
                        <div>
                          {editPairs.map((p, idx) => (
                            <div key={`${p.grade}-${p.subject}-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.45rem 0.65rem', border: '1px solid #e0e0e0', borderRadius: '10px', marginBottom: '0.5rem' }}>
                              <span style={{ fontWeight: 800, color: '#2c3e50' }}>
                                {p.grade} - {p.subject}
                              </span>
                              <button type="button" className="btn-danger" style={{ padding: '0.35rem 0.6rem' }} onClick={() => removePairAtIndex(idx, 'edit')}>
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="educators-modal-actions">
                      <button type="button" className="btn-secondary" onClick={closeCards}>
                        Cancel
                      </button>
                      <button type="button" className="btn-primary" onClick={submitEdit}>
                        Submit
                      </button>
                    </div>
                  </>
                )}

                {editStage === 'confirmAdmin' && (
                  <>
                    <p className="educators-hint">
                      Enter your admin password to confirm authenticity. If it is wrong, you will be logged out.
                    </p>
                    <label className="educators-label">
                      Admin Password
                      <input
                        className="educators-input"
                        type="password"
                        value={editAdminPassword}
                        onChange={(e) => setEditAdminPassword(e.target.value)}
                      />
                    </label>
                    <div className="educators-modal-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setEditStage('form');
                          setEditAdminPassword('');
                        }}
                      >
                        Back
                      </button>
                      <button type="button" className="btn-primary" onClick={confirmEdit}>
                        Confirm
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="educators-top-actions">
          <div />
          <div className="educators-actions-right">
            <button type="button" className="btn-primary" onClick={openAdd}>
              Add Educator
            </button>
            <button type="button" className="btn-danger" onClick={deleteAll}>
              Delete All
            </button>
          </div>
        </div>

        <div className="educators-table-wrap">
          <table className="educators-table">
            <thead>
              <tr>
                <th className="educators-th">
                  <div className="educators-username-header">
                    <input type="checkbox" checked={allChecked} onChange={(e) => toggleAll(e.target.checked)} aria-label="Select all educators" />
                    <span>Username</span>
                  </div>
                </th>
                <th className="educators-th">Password</th>
                <th className="educators-th">Grade</th>
                <th className="educators-th">Subject</th>
                <th className="educators-th educators-th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="educators-empty">
                    No educators found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.username}>
                    <td>
                      <div className="educators-username-cell">
                        <input
                          type="checkbox"
                          checked={selected.has(row.username)}
                          onChange={(e) => toggleOne(row.username, e.target.checked)}
                          aria-label={`Select ${row.username}`}
                        />
                        <span>{row.username}</span>
                      </div>
                    </td>
                    <td>{maskPassword(row.username)}</td>
                    <td>{row.grade || '—'}</td>
                    <td>{row.subject || '—'}</td>
                    <td className="educators-td-actions">
                      <button type="button" className="educators-action-btn educators-edit-btn" onClick={() => openEdit(row)}>
                        <span className="educators-action-inner">
                          <IconEdit />
                          Edit
                        </span>
                      </button>
                      <button type="button" className="educators-action-btn educators-delete-btn" onClick={() => deleteSingle(row.username)}>
                        <span className="educators-action-inner">
                          <IconDelete />
                          Delete
                        </span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Educators;

