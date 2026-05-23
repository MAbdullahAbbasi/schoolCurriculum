import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { ROLE_LABELS } from './roleLabels';
import { IconBack, IconCancel, IconDelete, IconEdit, IconPromote, IconSave } from './ButtonIcons';
import {
  formatDateOfBirth,
  formatGradeDisplay,
  getNextGrade,
  requiresSubjectChoice,
  toDateInputValue,
} from './studentDataUtils';
import './StudentData.css';

const StudentDetail = () => {
  const { registrationNumber: regParam } = useParams();
  const registrationNumber = decodeURIComponent(regParam || '');
  const navigate = useNavigate();

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
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [promoting, setPromoting] = useState(false);

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
    setEditForm({
      enrollmentNumber: student.registrationNumber || registrationNumber,
      studentName: student.studentName || '',
      fathersName: student.fathersName || '',
      grade: student.grade || '',
      dateOfBirth: toDateInputValue(student.dateOfBirth),
      subject: student.subject || '',
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm({
      enrollmentNumber: '',
      studentName: '',
      fathersName: '',
      grade: '',
      dateOfBirth: '',
      subject: '',
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
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
    const newReg = editForm.enrollmentNumber.trim();
    try {
      setSaving(true);
      await axios.put(`${API_URL}/api/students-data/update`, {
        registrationNumber,
        newRegistrationNumber: newReg !== registrationNumber ? newReg : undefined,
        studentName: editForm.studentName.trim(),
        fathersName:
          editForm.fathersName != null ? String(editForm.fathersName).trim() : '',
        grade: editForm.grade.trim(),
        dateOfBirth: editForm.dateOfBirth,
        subject: requiresSubjectChoice(editForm.grade.trim()) ? editForm.subject : '',
      });
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
    const next = getNextGrade(student?.grade);
    if (!next) {
      alert('This student is already at the highest grade.');
      return;
    }
    const nextLabel = formatGradeDisplay(next);
    if (
      !window.confirm(
        `Promote "${student?.studentName || registrationNumber}" to Grade ${nextLabel}?`
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
      });
      alert(res.data.message || 'Student promoted.');
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
                <input
                  type="text"
                  className="student-edit-input student-detail-input"
                  value={editForm.grade}
                  onChange={(e) => handleEditFormChange('grade', e.target.value)}
                />
              ) : (
                student.grade || '—'
              )}
            </dd>
          </div>
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
                disabled={promoting || !getNextGrade(student.grade)}
                title={
                  getNextGrade(student.grade)
                    ? 'Promote to next grade'
                    : 'Already at highest grade'
                }
                aria-label="Promote to next grade"
              >
                <IconPromote />
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
