import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconDelete, IconEdit } from './ButtonIcons';
import './CourseAdmins.css';

const CourseAdmins = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(() => new Set());

  const [showAddCard, setShowAddCard] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addAdminPassword, setAddAdminPassword] = useState('');
  const [addStage, setAddStage] = useState('form'); // 'form' | 'confirmAdmin'

  const [showEditCard, setShowEditCard] = useState(false);
  const [editTargetUsername, setEditTargetUsername] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editStage, setEditStage] = useState('form'); // 'form' | 'confirmAdmin'

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/admin/course-admins`);
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setError('Failed to load course admins.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
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
    const all = new Set(rows.map((r) => r.username).filter(Boolean));
    setSelected(all);
  };

  const toggleOne = (username, checked) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(username);
      else next.delete(username);
      return next;
    });
  };

  const maskPassword = (v) => {
    if (!v) return '********';
    return '********';
  };

  const handleAdd = async () => {
    setError(null);
    if (!addUsername.trim() || !addPassword.trim()) {
      setError('Username and password are required.');
      return;
    }

    setAddStage('confirmAdmin');
  };

  const handleAddConfirm = async () => {
    setError(null);
    try {
      const payload = {
        username: addUsername.trim(),
        password: addPassword,
        adminPassword: addAdminPassword,
      };
      const res = await axios.post(`${API_URL}/api/admin/course-admins`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.data?.success) {
        setShowAddCard(false);
        setAddStage('form');
        setAddUsername('');
        setAddPassword('');
        setAddAdminPassword('');
        setSelected(new Set());
        await fetchRows();
      } else {
        setError(res.data?.message || 'Failed to create.');
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        // Wrong admin password => log out
        logoutAndReload();
        return;
      }
      setError(err.response?.data?.message || 'Failed to create course admin.');
    }
  };

  const openEdit = (row) => {
    setShowEditCard(true);
    setEditStage('form');
    setEditTargetUsername(row.username);
    setEditUsername(row.username);
    setEditPassword('');
    setEditAdminPassword('');
  };

  const submitEdit = async () => {
    setError(null);
    // username required, password optional (blank means keep unchanged)
    if (!editUsername.trim()) {
      setError('Username is required.');
      return;
    }
    setEditStage('confirmAdmin');
  };

  const confirmEdit = async () => {
    setError(null);
    try {
      const payload = {
        newUsername: editUsername.trim(),
        password: editPassword.trim() ? editPassword : undefined,
        adminPassword: editAdminPassword,
      };
      const res = await axios.put(`${API_URL}/api/admin/course-admins/${encodeURIComponent(editTargetUsername)}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.data?.success) {
        setShowEditCard(false);
        setEditStage('form');
        setEditTargetUsername('');
        setEditUsername('');
        setEditPassword('');
        setEditAdminPassword('');
        setSelected(new Set());
        await fetchRows();
      } else {
        setError(res.data?.message || 'Failed to update.');
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 403) {
        logoutAndReload();
        return;
      }
      setError(err.response?.data?.message || 'Failed to update course admin.');
    }
  };

  const deleteSingle = async (username) => {
    setError(null);
    const ok = window.confirm(`Delete course admin "${username}"?`);
    if (!ok) return;
    try {
      await axios.delete(`${API_URL}/api/admin/course-admins/${encodeURIComponent(username)}`);
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

  const deleteAll = async () => {
    setError(null);
    try {
      const usernames = Array.from(selected);
      const hasSelection = usernames.length > 0;
      const ok = window.confirm(
        hasSelection ? `Delete ${usernames.length} selected course admin(s)?` : 'Delete ALL course admins?'
      );
      if (!ok) return;

      if (hasSelection) {
        await axios.post(`${API_URL}/api/admin/course-admins/bulk-delete`, { usernames });
      } else {
        await axios.delete(`${API_URL}/api/admin/course-admins/all`);
      }

      setSelected(new Set());
      await fetchRows();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete all.');
    }
  };

  const allChecked = useMemo(() => rows.length > 0 && rows.every((r) => selected.has(r.username)), [rows, selected]);

  if (loading) {
    return (
      <div className="course-admins-container">
        <CurriculumHeader />
        <div className="course-admins-content">
          <div className="loading-spinner">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-admins-container">
      <CurriculumHeader />
      <div className="course-admins-content">
        <h2 className="course-admins-title">Course Admins</h2>
        {error && <div className="course-admins-error">{error}</div>}

        {(showAddCard || showEditCard) && (
          <div className="course-admins-modal-wrap">
            {showAddCard && (
              <div className="course-admins-modal-card">
                <h3 className="course-admins-modal-title">Add Course Admin</h3>
                {addStage === 'form' && (
                  <>
                    <label className="course-admins-label">
                      Username
                      <input className="course-admins-input" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} />
                    </label>
                    <label className="course-admins-label">
                      Password
                      <input
                        className="course-admins-input"
                        type="password"
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                      />
                    </label>

                    <div className="course-admins-modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowAddCard(false)}>
                        Cancel
                      </button>
                      <button type="button" className="btn-primary" onClick={handleAdd}>
                        Submit
                      </button>
                    </div>
                  </>
                )}

                {addStage === 'confirmAdmin' && (
                  <>
                    <p className="course-admins-hint">
                      Enter your admin password to confirm authenticity. If it is wrong, you will be logged out.
                    </p>
                    <label className="course-admins-label">
                      Admin Password
                      <input
                        className="course-admins-input"
                        type="password"
                        value={addAdminPassword}
                        onChange={(e) => setAddAdminPassword(e.target.value)}
                      />
                    </label>
                    <div className="course-admins-modal-actions">
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
                      <button type="button" className="btn-primary" onClick={handleAddConfirm}>
                        Confirm
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {showEditCard && (
              <div className="course-admins-modal-card">
                <h3 className="course-admins-modal-title">Edit Course Admin</h3>
                {editStage === 'form' && (
                  <>
                    <label className="course-admins-label">
                      Username
                      <input className="course-admins-input" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                    </label>
                    <label className="course-admins-label">
                      New Password (optional)
                      <input
                        className="course-admins-input"
                        type="password"
                        placeholder="Leave blank to keep"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                      />
                    </label>

                    <div className="course-admins-modal-actions">
                      <button type="button" className="btn-secondary" onClick={() => setShowEditCard(false)}>
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
                    <p className="course-admins-hint">
                      Enter your admin password to confirm authenticity. If it is wrong, you will be logged out.
                    </p>
                    <label className="course-admins-label">
                      Admin Password
                      <input
                        className="course-admins-input"
                        type="password"
                        value={editAdminPassword}
                        onChange={(e) => setEditAdminPassword(e.target.value)}
                      />
                    </label>
                    <div className="course-admins-modal-actions">
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

        <div className="course-admins-top-actions">
          <div />
          <div className="course-admins-actions-right">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setShowEditCard(false);
                setShowAddCard(true);
                setAddStage('form');
                setAddUsername('');
                setAddPassword('');
                setAddAdminPassword('');
              }}
            >
              Add Course Admin
            </button>
            <button type="button" className="btn-danger" onClick={deleteAll}>
              Delete All
            </button>
          </div>
        </div>

        <div className="course-admins-table-wrap">
          <table className="course-admins-table">
            <thead>
              <tr>
                <th className="course-admins-th">
                  <div className="course-admins-username-header">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Select all course admins"
                    />
                    <span>Username</span>
                  </div>
                </th>
                <th className="course-admins-th">Password</th>
                <th className="course-admins-th course-admins-th-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="course-admins-empty">
                    No course admins found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.username}>
                    <td>
                      <div className="course-admins-username-cell">
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
                    <td className="course-admins-td-actions">
                      <button
                        type="button"
                        className="course-admins-action-btn course-admins-edit-btn"
                        onClick={() => openEdit(row)}
                        aria-label={`Edit ${row.username}`}
                      >
                        <span className="course-admins-action-inner">
                          <IconEdit />
                          Edit
                        </span>
                      </button>
                      <button
                        type="button"
                        className="course-admins-action-btn course-admins-delete-btn"
                        onClick={() => deleteSingle(row.username)}
                        aria-label={`Delete ${row.username}`}
                      >
                        <span className="course-admins-action-inner">
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

export default CourseAdmins;

