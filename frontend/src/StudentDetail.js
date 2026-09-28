import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { ROLE_LABELS } from './roleLabels';
import { IconBack, IconCancel, IconDelete, IconEdit, IconPromote, IconAlumni, IconSave } from './ButtonIcons';
import {
  formatDateOfBirth,
  formatGradeDisplay,
  formatGradeOptionLabel,
  getGradeSelectOptions,
  getNextGrade,
  gradeToSelectValue,
  isClassTen,
  isValidStudentEmail,
  isValidStudentPortalPassword,
  currentPassedOutYear,
  normalizeStudentEmail,
  requiresSubjectChoice,
  toDateInputValue,
} from './studentDataUtils';
import { canManageStudentPortal } from './authUtils';
import './StudentData.css';

const StudentDetail = () => {
  const { registrationNumber: regParam } = useParams();
  const registrationNumber = decodeURIComponent(regParam || '');
  const navigate = useNavigate();
  const canManagePortal = canManageStudentPortal();

  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    enrollmentNumber: '',
    studentName: '',
    fathersName: '',
    grade: '',
    dateOfBirth: '',
    subject: '',
    email: '',
    assignStudentPortal: false,
    portalPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [portalNotice, setPortalNotice] = useState(null);

  const loadStudent = useCallback(async () => {
    if (!registrationNumber) {
      setError('No registration number provided.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/students-data`);
      const list = Array.isArray(response.data) ? response.data : [];
      const found = list.find(
        (s) => String(s.registrationNumber) === String(registrationNumber)
      );
      if (!found) {
        setStudent(null);
        setError(`${ROLE_LABELS.seedling} not found.`);
      } else {
        setStudent(found);
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          'Failed to load student record.'
      );
    } finally {
      setLoading(false);
    }
  }, [registrationNumber]);

  useEffect(() => {
    loadStudent();
  }, [loadStudent]);

  const startEdit = () => {
    if (!student) return;
    setPortalNotice(null);
    setEditForm({
      enrollmentNumber: student.registrationNumber || registrationNumber,
      studentName: student.studentName || '',
      fathersName: student.fathersName || '',
      grade: gradeToSelectValue(student.grade),
      dateOfBirth: toDateInputValue(student.dateOfBirth),
      subject: student.subject || '',
      email: student.email || '',
      assignStudentPortal: false,
      portalPassword: '',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setPortalNotice(null);
    setEditForm({
      enrollmentNumber: '',
      studentName: '',
      fathersName: '',
      grade: '',
      dateOfBirth: '',
      subject: '',
      email: '',
      assignStudentPortal: false,
      portalPassword: '',
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'grade' && !requiresSubjectChoice(value)) {
        next.subject = '';
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!editForm.enrollmentNumber?.trim() || !editForm.studentName?.trim() || !editForm.grade?.trim() || !editForm.dateOfBirth) {
      alert('Please fill all required fields.');
      return;
    }
    if (requiresSubjectChoice(editForm.grade.trim()) && !editForm.subject) {
      alert('For Grades 8, 9, and 10, please select Subject (Biology or Computer).');
      return;
    }
    if (!isValidStudentEmail(editForm.email)) {
      alert('Invalid email format. Use student@example.com or leave blank.');
      return;
    }
    const passwordTrimmed = editForm.portalPassword != null ? String(editForm.portalPassword).trim() : '';
    if (passwordTrimmed && !isValidStudentPortalPassword(passwordTrimmed)) {
      alert(
        'Portal password must be exactly 8 characters and include uppercase, lowercase, a number, and a special character.'
      );
      return;
    }
    const newReg = editForm.enrollmentNumber.trim();
    try {
      setSaving(true);
      setPortalNotice(null);
      const payload = {
        registrationNumber,
        newRegistrationNumber: newReg !== registrationNumber ? newReg : undefined,
        studentName: editForm.studentName.trim(),
        fathersName:
          editForm.fathersName != null ? String(editForm.fathersName).trim() : '',
        grade: editForm.grade.trim(),
        dateOfBirth: editForm.dateOfBirth,
        email: normalizeStudentEmail(editForm.email),
        subject: requiresSubjectChoice(editForm.grade.trim()) ? editForm.subject : '',
      };
      if (canManagePortal && !student.portalAssigned && editForm.assignStudentPortal) {
        payload.assignStudentPortal = true;
      }
      if (canManagePortal && student.portalAssigned && passwordTrimmed) {
        payload.portalPassword = passwordTrimmed;
      }
      const res = await axios.put(`${API_URL}/api/students-data/update`, payload);
      if (res.data?.portalCredentials?.password) {
        setPortalNotice({
          username: res.data.portalCredentials.username,
          password: res.data.portalCredentials.password,
        });
      }
      setEditing(false);
      if (newReg !== registrationNumber) {
        navigate(`/students-data/${encodeURIComponent(newReg)}`, { replace: true });
      } else {
        await loadStudent();
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to update record';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async () => {
    const passingOut = isClassTen(student?.grade);
    const next = getNextGrade(student?.grade);
    if (!next && !passingOut) {
      alert('This student is already at the highest grade.');
      return;
    }
    const year = currentPassedOutYear();
    const nextLabel = passingOut ? `alumni (${year})` : formatGradeDisplay(next);
    if (
      !window.confirm(
        passingOut
          ? `Mark "${student?.studentName || registrationNumber}" as passed out for ${year}? They will move to Alumni.`
          : `Promote "${student?.studentName || registrationNumber}" to ${nextLabel}?`
      )
    ) {
      return;
    }
    try {
      setPromoting(true);
      const res = await axios.post(`${API_URL}/api/students-data/promote`, {
        mode: 'selected',
        sourceGrade: student.grade,
        registrationNumbers: [registrationNumber],
        ...(passingOut ? { passedOutYear: year } : {}),
      });
      alert(res.data.message || (passingOut ? 'Student saved as alumni.' : 'Student promoted.'));
      if (res.data.passedOut) {
        navigate('/students-data/alumni');
        return;
      }
      const promoted = res.data.promoted?.[0];
      const newReg = promoted?.newRegistrationNumber || promoted?.toEnrollment;
      if (newReg && newReg !== registrationNumber) {
        navigate(`/students-data/${encodeURIComponent(newReg)}`, { replace: true });
      } else {
        await loadStudent();
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to promote student.'
      );
    } finally {
      setPromoting(false);
    }
  };

  const handleDelete = async () => {
    const name = student?.studentName || registrationNumber;
    if (
      !window.confirm(
        `Delete record for "${name}"? This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setDeleting(true);
      await axios.delete(`${API_URL}/api/students-data/single`, {
        data: { registrationNumber },
      });
      navigate('/students-data');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to delete record.';
      alert(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="student-data-container">
        <div className="loading-spinner">
          <div className="spinner" />
          <p>Loading {ROLE_LABELS.seedling.toLowerCase()}...</p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="student-data-container student-detail-page">
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
        <div className="error-message">{error || 'Record not found.'}</div>
      </div>
    );
  }

  const showSubject =
    editing
      ? requiresSubjectChoice(editForm.grade)
      : requiresSubjectChoice(student.grade);

  return (
    <div className="student-data-container student-detail-page">
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

      <div className="student-detail-card">
        <div className="student-detail-header">
          <h2 className="student-detail-name">
            {editing ? editForm.studentName || student.studentName : student.studentName}
          </h2>
          <p className="student-detail-reg">{registrationNumber}</p>
        </div>

        <dl className="student-detail-fields">
          <div className="student-detail-field">
            <dt>Enrollment (Registration Number)</dt>
            <dd>
              {editing ? (
                <input
                  type="text"
                  className="student-edit-input student-detail-input"
                  value={editForm.enrollmentNumber}
                  onChange={(e) => handleEditFormChange('enrollmentNumber', e.target.value)}
                />
              ) : (
                registrationNumber
              )}
            </dd>
          </div>
          <div className="student-detail-field">
            <dt>{ROLE_LABELS.seedling} name</dt>
            <dd>
              {editing ? (
                <input
                  type="text"
                  className="student-edit-input student-detail-input"
                  value={editForm.studentName}
                  onChange={(e) => handleEditFormChange('studentName', e.target.value)}
                />
              ) : (
                student.studentName || '—'
              )}
            </dd>
          </div>
          <div className="student-detail-field">
            <dt>Fathers Name</dt>
            <dd>
              {editing ? (
                <input
                  type="text"
                  className="student-edit-input student-detail-input"
                  value={editForm.fathersName}
                  onChange={(e) => handleEditFormChange('fathersName', e.target.value)}
                />
              ) : (
                student.fathersName || '—'
              )}
            </dd>
          </div>
          <div className="student-detail-field">
            <dt>Grade</dt>
            <dd>
              {editing ? (
                <select
                  className="student-edit-input student-detail-input"
                  value={editForm.grade}
                  onChange={(e) => handleEditFormChange('grade', e.target.value)}
                >
                  <option value="">Select grade</option>
                  {getGradeSelectOptions(student.grade).map((g) => (
                    <option key={g} value={g}>
                      {formatGradeOptionLabel(g)}
                    </option>
                  ))}
                </select>
              ) : (
                formatGradeDisplay(student.grade) || student.grade || '—'
              )}
            </dd>
          </div>
          <div className="student-detail-field">
            <dt>Email</dt>
            <dd>
              {editing ? (
                <input
                  type="email"
                  className="student-edit-input student-detail-input"
                  value={editForm.email}
                  onChange={(e) => handleEditFormChange('email', e.target.value)}
                  placeholder="Email (optional)"
                  autoComplete="email"
                />
              ) : (
                student.email || '—'
              )}
            </dd>
          </div>
          {canManagePortal && (
            <div className="student-detail-field student-detail-field--portal">
              <dt>Student Portal</dt>
              <dd>
                {editing ? (
                  student.portalAssigned ? (
                    <div className="student-portal-edit-block">
                      <p className="student-portal-status">Portal assigned</p>
                      <label className="student-portal-readonly-label" htmlFor="detail-portal-username">
                        Username (registration number — read-only)
                      </label>
                      <input
                        id="detail-portal-username"
                        type="text"
                        className="student-edit-input student-detail-input"
                        value={editForm.enrollmentNumber || registrationNumber}
                        readOnly
                        disabled
                      />
                      <label className="student-portal-readonly-label" htmlFor="detail-portal-password">
                        New portal password (optional)
                      </label>
                      <input
                        id="detail-portal-password"
                        type="text"
                        className="student-edit-input student-detail-input"
                        value={editForm.portalPassword}
                        onChange={(e) => handleEditFormChange('portalPassword', e.target.value)}
                        placeholder="Leave blank to keep current"
                        autoComplete="new-password"
                      />
                      <p className="student-portal-hint">
                        Exactly 8 characters with uppercase, lowercase, a number, and a special
                        character.
                      </p>
                    </div>
                  ) : (
                    <div className="student-portal-edit-block">
                      <label className="add-portal-assign-label" htmlFor="detail-assign-portal">
                        <input
                          id="detail-assign-portal"
                          type="checkbox"
                          checked={Boolean(editForm.assignStudentPortal)}
                          onChange={(e) =>
                            handleEditFormChange('assignStudentPortal', e.target.checked)
                          }
                        />
                        <span>Assign Student Portal</span>
                      </label>
                      <p className="student-portal-hint">
                        Username will be the registration number. A secure password is generated
                        automatically when you save.
                      </p>
                    </div>
                  )
                ) : student.portalAssigned ? (
                  <div className="student-portal-credentials">
                    <div>
                      <span className="student-portal-cred-label">Username:</span>{' '}
                      {student.registrationNumber}
                    </div>
                    <div>
                      <span className="student-portal-cred-label">Password:</span>{' '}
                      {student.portalPasswordDisplay || '—'}
                    </div>
                  </div>
                ) : (
                  <span className="student-portal-not-assigned">Not Assigned</span>
                )}
              </dd>
            </div>
          )}
          {showSubject && (
            <div className="student-detail-field">
              <dt>Subject</dt>
              <dd>
                {editing ? (
                  <div className="radio-group-inline">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="detail-subject"
                        value="Biology"
                        checked={editForm.subject === 'Biology'}
                        onChange={(e) => handleEditFormChange('subject', e.target.value)}
                      />
                      <span>Biology</span>
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="detail-subject"
                        value="Computer"
                        checked={editForm.subject === 'Computer'}
                        onChange={(e) => handleEditFormChange('subject', e.target.value)}
                      />
                      <span>Computer</span>
                    </label>
                  </div>
                ) : (
                  student.subject || '—'
                )}
              </dd>
            </div>
          )}
          <div className="student-detail-field">
            <dt>Date of Birth</dt>
            <dd>
              {editing ? (
                <input
                  type="date"
                  className="student-edit-input student-detail-input"
                  value={editForm.dateOfBirth}
                  onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
                />
              ) : (
                formatDateOfBirth(student.dateOfBirth)
              )}
            </dd>
          </div>
        </dl>

        {portalNotice && (
          <div className="portal-credentials-card portal-credentials-card--ok" role="status">
            <h4 className="portal-credentials-title">Student Portal Credentials</h4>
            <p className="portal-credentials-line">
              <strong>Username:</strong> <code>{portalNotice.username}</code>
            </p>
            <p className="portal-credentials-line">
              <strong>Password:</strong> <code>{portalNotice.password}</code>
            </p>
          </div>
        )}

        <div className="student-detail-actions">
          {editing ? (
            <>
              <button
                type="button"
                className="save-record-btn icon-btn icon-only-btn"
                onClick={handleSave}
                disabled={saving}
                title={saving ? 'Saving...' : 'Save'}
                aria-label={saving ? 'Saving...' : 'Save changes'}
              >
                <IconSave />
              </button>
              <button
                type="button"
                className="cancel-edit-btn icon-btn icon-only-btn"
                onClick={cancelEdit}
                disabled={saving}
                title="Cancel"
                aria-label="Cancel editing"
              >
                <IconCancel />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="edit-record-btn icon-btn icon-only-btn"
                onClick={startEdit}
                title="Edit"
                aria-label="Edit student"
              >
                <IconEdit />
              </button>
              <button
                type="button"
                className="promote-action-btn icon-btn icon-only-btn"
                onClick={handlePromote}
                disabled={promoting || (!getNextGrade(student.grade) && !isClassTen(student.grade))}
                title={
                  isClassTen(student.grade)
                    ? 'Mark as passed out (alumni)'
                    : getNextGrade(student.grade)
                      ? 'Promote to next grade'
                      : 'Already at highest grade'
                }
                aria-label={isClassTen(student.grade) ? 'Mark as passed out' : 'Promote to next grade'}
              >
                {isClassTen(student.grade) ? <IconAlumni /> : <IconPromote />}
              </button>
            </>
          )}
          <button
            type="button"
            className="delete-record-btn icon-btn icon-only-btn"
            onClick={handleDelete}
            disabled={deleting || editing}
            title={deleting ? 'Deleting...' : 'Delete'}
            aria-label={deleting ? 'Deleting...' : 'Delete student'}
          >
            <IconDelete />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;
