import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from './config/api';
import { IconEdit, IconSave, IconCancel } from './ButtonIcons';
import './CourseAdmins.css';
import './RootLogins.css';

const RootLogins = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [editTarget, setEditTarget] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [confirmSuperPassword, setConfirmSuperPassword] = useState('');

  const [ownCurrent, setOwnCurrent] = useState('');
  const [ownNew, setOwnNew] = useState('');
  const [ownConfirm, setOwnConfirm] = useState('');
  const [changingOwn, setChangingOwn] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/api/super-admin/users`);
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load logins.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const openEdit = (row) => {
    setEditTarget(row.username);
    setEditPassword('');
    setConfirmSuperPassword('');
    setSuccess(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditTarget(null);
    setEditPassword('');
    setConfirmSuperPassword('');
  };

  const saveEdit = async () => {
    setError(null);
    setSuccess(null);
    if (!editPassword.trim()) {
      setError('Enter a new password for this login.');
      return;
    }
    if (!confirmSuperPassword) {
      setError('Enter your password to confirm this change.');
      return;
    }
    try {
      const res = await axios.put(
        `${API_URL}/api/super-admin/users/${encodeURIComponent(editTarget)}`,
        { password: editPassword, superAdminPassword: confirmSuperPassword }
      );
      if (res.data?.success) {
        setSuccess(res.data.message || 'Password updated.');
        cancelEdit();
        await fetchRows();
      } else {
        setError(res.data?.message || 'Update failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update password.');
    }
  };

  const changeOwnPassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!ownCurrent || !ownNew.trim()) {
      setError('Current and new password are required.');
      return;
    }
    if (ownNew !== ownConfirm) {
      setError('New passwords do not match.');
      return;
    }
    try {
      setChangingOwn(true);
      const res = await axios.put(`${API_URL}/api/super-admin/me/password`, {
        currentPassword: ownCurrent,
        newPassword: ownNew,
      });
      if (res.data?.success) {
        setSuccess(res.data.message || 'Your password was updated.');
        setOwnCurrent('');
        setOwnNew('');
        setOwnConfirm('');
        await fetchRows();
      } else {
        setError(res.data?.message || 'Failed to update your password.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update your password.');
    } finally {
      setChangingOwn(false);
    }
  };

  return (
    <div className="course-admins-container root-logins-container">
      <div className="course-admins-content">
        <h2 className="course-admins-title page-local-header">All logins</h2>
        <p className="root-logins-intro">
          Root access — view and manage every login. You must enter your own password before changing
          any account.
        </p>

        {error && <div className="course-admins-error">{error}</div>}
        {success && <div className="root-logins-success">{success}</div>}

        <section className="root-logins-own-password">
          <h3>Change your password</h3>
          <form className="root-logins-own-form" onSubmit={changeOwnPassword}>
            <label>
              Current password
              <input
                type="password"
                value={ownCurrent}
                onChange={(e) => setOwnCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label>
              New password
              <input
                type="password"
                value={ownNew}
                onChange={(e) => setOwnNew(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm new password
              <input
                type="password"
                value={ownConfirm}
                onChange={(e) => setOwnConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <button type="submit" className="btn-primary" disabled={changingOwn}>
              {changingOwn ? 'Saving...' : 'Update my password'}
            </button>
          </form>
        </section>

        {loading ? (
          <p>Loading logins...</p>
        ) : (
          <div className="course-admins-table-wrap">
            <table className="course-admins-table root-logins-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Password</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.username}>
                    <td>{row.username}</td>
                    <td>{row.roleLabel || row.role}</td>
                    <td className="root-logins-password-cell">
                      {editTarget === row.username ? (
                        <input
                          type="text"
                          className="root-logins-password-input"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="New password"
                        />
                      ) : (
                        <code>{row.password || '—'}</code>
                      )}
                    </td>
                    <td>
                      {editTarget === row.username ? (
                        <div className="root-logins-edit-actions">
                          <input
                            type="password"
                            className="root-logins-confirm-input"
                            value={confirmSuperPassword}
                            onChange={(e) => setConfirmSuperPassword(e.target.value)}
                            placeholder="Your password to confirm"
                            aria-label="Your password to confirm"
                          />
                          <button type="button" className="btn-primary btn-sm" onClick={saveEdit}>
                            <IconSave /> Save
                          </button>
                          <button type="button" className="btn-secondary btn-sm" onClick={cancelEdit}>
                            <IconCancel /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => openEdit(row)}
                        >
                          <IconEdit /> Change password
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RootLogins;


