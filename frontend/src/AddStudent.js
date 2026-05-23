import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { ROLE_LABELS } from './roleLabels';
import { IconAdd, IconBack, IconUpload } from './ButtonIcons';
import { requiresSubjectChoice } from './studentDataUtils';
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
  });
  const [addError, setAddError] = useState(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const fileInputRef = useRef(null);

  const handleAddFormChange = (field, value) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
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
    try {
      setAddingStudent(true);
      setAddError(null);
      await axios.post(`${API_URL}/api/students-data`, {
        registrationNumber: addForm.registrationNumber.trim(),
        studentName: addForm.studentName.trim(),
        fathersName: addForm.fathersName != null ? String(addForm.fathersName).trim() : '',
        grade: addForm.grade.trim(),
        dateOfBirth: addForm.dateOfBirth,
        subject: requiresSubjectChoice(addForm.grade.trim()) ? addForm.subject : '',
      });
      navigate(`/students-data/${encodeURIComponent(addForm.registrationNumber.trim())}`);
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
              <input
                id="add-grade"
                type="text"
                value={addForm.grade}
                onChange={(e) => handleAddFormChange('grade', e.target.value)}
                placeholder="Grade"
                disabled={addingStudent}
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
          <button type="submit" className="add-student-btn" disabled={addingStudent}>
            <span className="btn-icon-wrap">
              <IconAdd />
              {addingStudent ? 'Adding...' : `Add ${ROLE_LABELS.seedling}`}
            </span>
          </button>
        </form>
      </section>

      <section className="add-student-section student-upload-section">
        <h3 className="add-student-title">Import from Excel</h3>
        <p className="upload-requirements upload-requirements-above">
          Excel columns: Registration Number, Student Name, Fathers Name, Grade, Date of Birth.
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
