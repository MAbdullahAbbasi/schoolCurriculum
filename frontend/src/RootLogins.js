import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from './config/api';
import { IconEdit, IconSave, IconCancel } from './ButtonIcons';
import { formatGradeOptionLabel, STUDENT_GRADE_OPTIONS } from './studentDataUtils';
import './CourseAdmins.css';
import './RootLogins.css';

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'SUPER_ADMIN', label: 'Root Admin' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'COURSE_ADMIN', label: 'Course Admin' },
  { value: 'EDUCATOR', label: 'Educator' },
  { value: 'GUEST', label: 'Guest' },
  { value: 'STUDENT', label: 'Student' },
];

const RootLogins = () => {
  const [rows, setRows] = useState([]);
  const [classOptions, setClassOptions] = useState(STUDENT_GRADE_OPTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [roleFilter, setRoleFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  const [editTargetKey, setEditTargetKey] = useState(null);
  const [editTargetUsername, setEditTargetUsername] = useState('');
  const [editAccountKind, setEditAccountKind] = useState('staff');
  const [editPassword, setEditPassword] = useState('');
  const [confirmSuperPassword, setConfirmSuperPassword] = useState('');

  const [ownCurrent, setOwnCurrent] = useState('');
  const [ownNew, setOwnNew] = useState('');
  const [ownConfirm, setOwnConfirm] = useState('');
  const [changingOwn, setChangingOwn] = useState(false);

  const showClassFilter = roleFilter === 'EDUCATOR' || roleFilter === 'STUDENT';

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (showClassFilter && classFilter) params.class = classFilter;
      const res = await axios.get(`${API_URL}/api/super-admin/users`, { params });
      setRows(Array.isArray(res.data?.data) ? res.data.data : []);
      if (Array.isArray(res.data?.classOptions) && res.data.classOptions.length) {
        setClassOptions(res.data.classOptions);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load logins.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, classFilter, showClassFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleRoleFilterChange = (value) => {
    setRoleFilter(value);
    setClassFilter('');
    cancelEdit();
  };

  const handleClassFilterChange = (value) => {
    setClassFilter(value);
    cancelEdit();
  };

  const openEdit = (row) => {
    setEditTargetKey(row.accountKey || `${row.accountKind}:${row.username}`);
    setEditTargetUsername(row.username);
    setEditAccountKind(row.accountKind === 'student' ? 'student' : 'staff');
    setEditPassword('');
    setConfirmSuperPassword('');
    setSuccess(null);
    setError(null);
  };

  const cancelEdit = () => {
    setEditTargetKey(null);
    setEditTargetUsername('');
    setEditAccountKind('staff');
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
    if (editAccountKind === 'student') {
      const p = editPassword.trim();
      if (
        p.length !== 8 ||
        !/[A-Z]/.test(p) ||
        !/[a-z]/.test(p) ||
        !/[0-9]/.test(p) ||
        !/[^A-Za-z0-9]/.test(p)
      ) {
        setError(
          'Student portal password must be exactly 8 characters and include uppercase, lowercase, a number, and a special character.'
        );
        return;
      }
    }
    try {
      const res = await axios.put(
        `${API_URL}/api/super-admin/users/${encodeURIComponent(editTargetUsername)}`,
        {
          password: editPassword,
          superAdminPassword: confirmSuperPassword,
          accountKind: editAccountKind,
        }
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

  const passwordPlaceholder = useMemo(
    () =>
      editAccountKind === 'student'
        ? 'New 8-char portal password'
        : 'New password',
    [editAccountKind]
  );

  return (
    <div className="course-admins-container root-logins-container">
      <div className="course-admins-content">
        <h2 className="course-admins-title page-local-header">All logins</h2>
        <p className="root-logins-intro">
          Root access — view and manage every login, including student portal accounts. You must enter
          your own password before changing any account.
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

        <div className="root-logins-filters">
          <label className="root-logins-filter-field">
            Role
            <select
              value={roleFilter}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              aria-label="Filter by role"
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          {showClassFilter ? (
            <label className="root-logins-filter-field">
              Class
              <select
                value={classFilter}
                onChange={(e) => handleClassFilterChange(e.target.value)}
                aria-label="Filter by class"
              >
                <option value="">All Classes</option>
                {classOptions.map((g) => (
                  <option key={g} value={g}>
                    {formatGradeOptionLabel(g)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {loading ? (
          <p>Loading logins...</p>
        ) : rows.length === 0 ? (
          <p className="root-logins-empty">No accounts match these filters.</p>
        ) : (
          <div className="course-admins-table-wrap">
            <table className="course-admins-table root-logins-table">
              <thead>
                <tr>
                  <th scope="col">S.No.</th>
                  <th scope="col">Username</th>
                  <th scope="col">Role</th>
                  <th scope="col">Class</th>
                  <th scope="col">Password</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const rowKey = row.accountKey || `${row.accountKind}:${row.username}`;
                  const isEditing = editTargetKey === rowKey;
                  return (
                    <tr key={rowKey}>
                      <td className="root-logins-col-serial">{index + 1}</td>
                      <td>
                        <div className="root-logins-username-cell">
                          <span>{row.username}</span>
                          {row.accountKind === 'student' && row.studentName ? (
                            <span className="root-logins-student-name">{row.studentName}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{row.roleLabel || row.role}</td>
                      <td className="root-logins-class-cell">{row.classLabel || '—'}</td>
                      <td className="root-logins-password-cell">
                        {isEditing ? (
                          <input
                            type="text"
                            className="root-logins-password-input"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            placeholder={passwordPlaceholder}
                            autoComplete="off"
                          />
                        ) : (
                          <code
                            className={
                              row.password
                                ? 'root-logins-password-value'
                                : 'root-logins-password--empty'
                            }
                          >
                            {row.password || 'Not stored'}
                          </code>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
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
                            <button
                              type="button"
                              className="btn-secondary btn-sm"
                              onClick={cancelEdit}
                            >
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RootLogins;
