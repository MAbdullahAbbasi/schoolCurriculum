import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { ROLE_LABELS } from './roleLabels';
import { IconAdd, IconBack, IconUpload } from './ButtonIcons';
import {
  formatGradeOptionLabel,
  isValidStudentEmail,
  normalizeStudentEmail,
  requiresSubjectChoice,
  STUDENT_GRADE_OPTIONS,
} from './studentDataUtils';
import './StudentData.css';

const AddStudent = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [addForm, setAddForm] = useState({
    registrationNumber: '',
    studentName: '',
    fathersName: '',
    grade: '',
    dateOfBirth: '',
    subject: '',
    email: '',
    assignStudentPortal: false,
  });
  const [addError, setAddError] = useState(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [portalSuccess, setPortalSuccess] = useState(null);
  const fileInputRef = useRef(null);

  const handleAddFormChange = (field, value) => {
    setAddForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'grade' && !requiresSubjectChoice(value)) {
        next.subject = '';
      }
      return next;
    });
    setAddError(null);
  };

  const handleAssignPortalChange = (checked) => {
    setAddForm((prev) => ({ ...prev, assignStudentPortal: checked }));
    setAddError(null);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (
      !addForm.registrationNumber?.trim() ||
      !addForm.studentName?.trim() ||
      !addForm.grade?.trim() ||
      !addForm.dateOfBirth
    ) {
      setAddError({
        message: `Registration Number, ${ROLE_LABELS.seedling} name, Grade and Date of Birth are required.`,
        solution: 'Please fill all required fields.',
      });
      return;
    }
    if (requiresSubjectChoice(addForm.grade.trim()) && !addForm.subject) {
      setAddError({
        message: 'For Grades 8, 9, and 10, please select Subject (Biology or Computer).',
        solution: 'Select Biology or Computer.',
      });
      return;
    }
    if (!isValidStudentEmail(addForm.email)) {
      setAddError({
        message: 'Invalid email format.',
        solution: 'Enter a valid email like student@example.com, or leave email blank.',
      });
      return;
    }
    const regNum = addForm.registrationNumber.trim();
    try {
      setAddingStudent(true);
      setAddError(null);
      setPortalSuccess(null);
      const response = await axios.post(`${API_URL}/api/students-data`, {
        registrationNumber: regNum,
        studentName: addForm.studentName.trim(),
        fathersName: addForm.fathersName != null ? String(addForm.fathersName).trim() : '',
        grade: addForm.grade.trim(),
        dateOfBirth: addForm.dateOfBirth,
        email: normalizeStudentEmail(addForm.email),
        subject: requiresSubjectChoice(addForm.grade.trim()) ? addForm.subject : '',
        assignStudentPortal: Boolean(addForm.assignStudentPortal),
      });

      if (addForm.assignStudentPortal) {
        if (response.data?.portalCredentials?.username && response.data?.portalCredentials?.password) {
          setPortalSuccess({
            registrationNumber: regNum,
            username: response.data.portalCredentials.username,
            password: response.data.portalCredentials.password,
            warning: null,
          });
          return;
        }
        setPortalSuccess({
          registrationNumber: regNum,
          username: null,
          password: null,
          warning:
            response.data?.portalError ||
            'Student was created, but the student portal was not assigned. You can assign it from the edit screen.',
        });
        return;
      }

      navigate(`/students-data/${encodeURIComponent(regNum)}`);
    } catch (err) {
      const data = err.response?.data;
      setAddError({
        message: data?.message || data?.error || err.message || 'Failed to add student.',
        solution:
          data?.solution ||
          'Check that the registration number is unique and all fields are valid.',
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (
      validTypes.includes(selectedFile.type) ||
      /\.(xlsx|xls|csv)$/i.test(selectedFile.name)
    ) {
      setFile(selectedFile);
      setUploadError(null);
      uploadFile(selectedFile);
    } else {
      setUploadError({
        message: 'Invalid file type.',
        solution: 'Please upload a valid Excel file (.xlsx, .xls) or CSV file.',
      });
      setFile(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFile = async (fileToUpload) => {
    if (!fileToUpload) return;
    const formData = new FormData();
    formData.append('file', fileToUpload);
    try {
      setUploading(true);
      setUploadError(null);
      const response = await axios.post(`${API_URL}/api/students-data/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setFile(null);
        navigate('/students-data');
      }
    } catch (err) {
      const data = err.response?.data;
      setUploadError({
        message: data?.message || data?.error || err.message || 'Failed to upload file.',
        solution:
          data?.solution ||
          'Check that your file has the required columns in the correct order and that all required fields have valid values.',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="student-data-container student-add-page">
      <button type="button" className="student-page-back-btn" onClick={() => navigate('/students-data')}>
        <span className="btn-icon-wrap">
          <IconBack />
          Back to directory
        </span>
      </button>

      <section className="add-student-section">
        <h3 className="add-student-title">Add a {ROLE_LABELS.seedling.toLowerCase()} individually</h3>
        {addError && (
          <div className="add-error-message" role="alert">
            <strong>Error:</strong> {addError.message}
            {addError.solution && <p className="add-error-solution">{addError.solution}</p>}
          </div>
        )}
        <form className="add-student-form" onSubmit={handleAddStudent}>
          <div className="add-student-fields">
            <div className="add-field">
              <label htmlFor="add-registrationNumber">Registration Number</label>
              <input
                id="add-registrationNumber"
                type="text"
                value={addForm.registrationNumber}
                onChange={(e) => handleAddFormChange('registrationNumber', e.target.value)}
                placeholder="Registration Number"
                disabled={addingStudent}
              />
            </div>
            <div className="add-field">
              <label htmlFor="add-studentName">{ROLE_LABELS.seedling} name</label>
              <input
                id="add-studentName"
                type="text"
                value={addForm.studentName}
                onChange={(e) => handleAddFormChange('studentName', e.target.value)}
                placeholder="Name"
                disabled={addingStudent}
              />
            </div>
            <div className="add-field">
              <label htmlFor="add-fathersName">Fathers Name</label>
              <input
                id="add-fathersName"
                type="text"
                value={addForm.fathersName}
                onChange={(e) => handleAddFormChange('fathersName', e.target.value)}
                placeholder="Fathers Name (optional)"
                disabled={addingStudent}
              />
            </div>
            <div className="add-field">
              <label htmlFor="add-grade">Grade</label>
              <select
                id="add-grade"
                value={addForm.grade}
                onChange={(e) => handleAddFormChange('grade', e.target.value)}
                disabled={addingStudent}
                required
              >
                <option value="">Select grade</option>
                {STUDENT_GRADE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {formatGradeOptionLabel(g)}
                  </option>
                ))}
              </select>
            </div>
            <div className="add-field">
              <label htmlFor="add-email">Email</label>
              <input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => handleAddFormChange('email', e.target.value)}
                placeholder="Email (optional)"
                disabled={addingStudent}
                autoComplete="email"
              />
            </div>
            {requiresSubjectChoice(addForm.grade) && (
              <div className="add-field add-field-radio">
                <span className="add-field-label">Subject (Class 8/9/10)</span>
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="add-subject"
                      value="Biology"
                      checked={addForm.subject === 'Biology'}
                      onChange={(e) => handleAddFormChange('subject', e.target.value)}
                      disabled={addingStudent}
                    />
                    <span>Biology</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="add-subject"
                      value="Computer"
                      checked={addForm.subject === 'Computer'}
                      onChange={(e) => handleAddFormChange('subject', e.target.value)}
                      disabled={addingStudent}
                    />
                    <span>Computer</span>
                  </label>
                </div>
              </div>
            )}
            <div className="add-field">
              <label htmlFor="add-dateOfBirth">Date of Birth</label>
              <input
                id="add-dateOfBirth"
                type="date"
                value={addForm.dateOfBirth}
                onChange={(e) => handleAddFormChange('dateOfBirth', e.target.value)}
                disabled={addingStudent}
              />
            </div>
          </div>
          <div className="add-portal-assign">
            <label className="add-portal-assign-label" htmlFor="add-assign-portal">
              <input
                id="add-assign-portal"
                type="checkbox"
                checked={Boolean(addForm.assignStudentPortal)}
                onChange={(e) => handleAssignPortalChange(e.target.checked)}
                disabled={addingStudent}
              />
              <span>Assign Student Portal</span>
            </label>
            <p className="add-portal-assign-hint">
              When checked, a portal account is created automatically. Username is the registration
              number; a secure 8-character password is generated on the server.
            </p>
          </div>
          <button type="submit" className="add-student-btn" disabled={addingStudent}>
            <span className="btn-icon-wrap">
              <IconAdd />
              {addingStudent ? 'Adding...' : `Add ${ROLE_LABELS.seedling}`}
            </span>
          </button>
        </form>
        {portalSuccess && (
          <div
            className={`portal-credentials-card ${portalSuccess.warning ? 'portal-credentials-card--warn' : 'portal-credentials-card--ok'}`}
            role="status"
          >
            {portalSuccess.username && portalSuccess.password ? (
              <>
                <h4 className="portal-credentials-title">Student Portal Assigned Successfully</h4>
                <p className="portal-credentials-line">
                  <strong>Username:</strong> <code>{portalSuccess.username}</code>
                </p>
                <p className="portal-credentials-line">
                  <strong>Password:</strong> <code>{portalSuccess.password}</code>
                </p>
                <p className="portal-credentials-note">
                  Share these credentials with the student or parent. The password is also shown in
                  the Seedlings directory for admins.
                </p>
              </>
            ) : (
              <>
                <h4 className="portal-credentials-title">{ROLE_LABELS.seedling} created</h4>
                <p className="portal-credentials-note">{portalSuccess.warning}</p>
              </>
            )}
            <div className="portal-credentials-actions">
              <button
                type="button"
                className="add-student-btn"
                onClick={() =>
                  navigate(
                    `/students-data/${encodeURIComponent(portalSuccess.registrationNumber)}`
                  )
                }
              >
                Open {ROLE_LABELS.seedling.toLowerCase()} profile
              </button>
              <button
                type="button"
                className="student-page-back-btn"
                onClick={() => navigate('/students-data')}
              >
                Back to directory
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="add-student-section student-upload-section">
        <h3 className="add-student-title">Import from Excel</h3>
        <p className="upload-requirements upload-requirements-above">
          Excel columns: Registration Number, Student Name, Fathers Name, Grade, Date of Birth.
          Optional: Email. Grades must be KG-2 or 1–12.
          For Class 8/9/10 rows only, include a Subject column with values Biology or Computer.
        </p>
        {uploadError && (
          <div className="upload-error-message" role="alert">
            <strong>Upload error:</strong> {uploadError.message}
            {uploadError.solution && (
              <p className="upload-error-solution">{uploadError.solution}</p>
            )}
          </div>
        )}
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="file-input-hidden"
          disabled={uploading}
        />
        <button
          type="button"
          className="upload-file-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={file ? file.name : undefined}
        >
          <span className="btn-icon-wrap">
            <IconUpload />
            {uploading ? 'Uploading...' : file ? `Upload ${file.name}` : 'Choose Excel file'}
          </span>
        </button>
      </section>
    </div>
  );
};

export default AddStudent;
