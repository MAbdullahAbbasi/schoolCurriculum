import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './StudentData.css';

const StudentData = () => {
  const handleCreateCourseClick = () => {
    // This will be handled by the header's navigation
  };
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [studentsData, setStudentsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingRegistrationNumber, setEditingRegistrationNumber] = useState(null);
  const [editForm, setEditForm] = useState({ studentName: '', fathersName: '', grade: '', dateOfBirth: '' });
  const [uploadError, setUploadError] = useState(null);
  const [addForm, setAddForm] = useState({
    registrationNumber: '',
    studentName: '',
    fathersName: '',
    grade: '',
    dateOfBirth: '',
  });
  const [addError, setAddError] = useState(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [savingRegistrationNumber, setSavingRegistrationNumber] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingRegistrationNumber, setDeletingRegistrationNumber] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedRegistrationNumbers, setSelectedRegistrationNumbers] = useState(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch existing students data on component mount
  useEffect(() => {
    fetchStudentsData();
  }, []);

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/students-data`);
      setStudentsData(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching students data:', err);
      setError('Failed to fetch students data');
      // Still try to show existing data if available
      if (err.response && err.response.data) {
        setError(err.response.data.error || 'Failed to fetch students data');
      }
    } finally {
      setLoading(false);
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
    if (validTypes.includes(selectedFile.type) || /\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
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
        await fetchStudentsData();
        setFile(null);
      }
    } catch (err) {
      const data = err.response?.data;
      setUploadError({
        message: data?.message || data?.error || err.message || 'Failed to upload file.',
        solution: data?.solution || 'Check that your file has the required columns in the correct order and that all required fields have valid values.',
      });
      await fetchStudentsData();
    } finally {
      setUploading(false);
    }
  };

  const handleEditClick = (student) => {
    setEditingRegistrationNumber(student.registrationNumber);
    let dob = student.dateOfBirth || '';
    if (dob && typeof dob === 'string' && dob.length > 10) {
      dob = dob.split('T')[0];
    }
    setEditForm({
      studentName: student.studentName || '',
      fathersName: student.fathersName || '',
      grade: student.grade || '',
      dateOfBirth: dob,
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddFormChange = (field, value) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
    setAddError(null);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!addForm.registrationNumber?.trim() || !addForm.studentName?.trim() || !addForm.grade?.trim() || !addForm.dateOfBirth) {
      setAddError({
        message: 'Registration Number, Student Name, Grade and Date of Birth are required.',
        solution: 'Please fill all required fields.',
      });
      return;
    }
    try {
      setAddingStudent(true);
      setAddError(null);
      await axios.post(`${API_URL}/api/students-data`, {
        registrationNumber: addForm.registrationNumber.trim(),
        studentName: addForm.studentName.trim(),
        fathersName: (addForm.fathersName != null) ? String(addForm.fathersName).trim() : '',
        grade: addForm.grade.trim(),
        dateOfBirth: addForm.dateOfBirth,
      });
      setAddForm({ registrationNumber: '', studentName: '', fathersName: '', grade: '', dateOfBirth: '' });
      await fetchStudentsData();
    } catch (err) {
      const data = err.response?.data;
      setAddError({
        message: data?.message || data?.error || err.message || 'Failed to add student.',
        solution: data?.solution || 'Check that the registration number is unique and all fields are valid.',
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingRegistrationNumber(null);
    setEditForm({ studentName: '', fathersName: '', grade: '', dateOfBirth: '' });
  };

  const handleSaveClick = async (registrationNumber) => {
    if (!editForm.studentName?.trim() || !editForm.grade?.trim() || !editForm.dateOfBirth) {
      alert('Please fill all fields.');
      return;
    }
    try {
      setSavingRegistrationNumber(registrationNumber);
      setError(null);
      await axios.put(`${API_URL}/api/students-data/update`, {
        registrationNumber,
        studentName: editForm.studentName.trim(),
        fathersName: (editForm.fathersName != null) ? String(editForm.fathersName).trim() : '',
        grade: editForm.grade.trim(),
        dateOfBirth: editForm.dateOfBirth,
      });
      await fetchStudentsData();
      setEditingRegistrationNumber(null);
      setEditForm({ studentName: '', fathersName: '', grade: '', dateOfBirth: '' });
    } catch (err) {
      console.error('Error updating student:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update record';
      alert(msg);
    } finally {
      setSavingRegistrationNumber(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL student data? This cannot be undone.')) {
      return;
    }
    try {
      setDeletingAll(true);
      setError(null);
      const res = await axios.delete(`${API_URL}/api/students-data/all`);
      if (res.data.success) {
        alert(res.data.message || 'All student data has been deleted.');
        await fetchStudentsData();
      } else {
        alert(res.data.error || res.data.message || 'Failed to delete data.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete data.';
      alert(msg);
    } finally {
      setDeletingAll(false);
    }
  };

  const handleDeleteOne = async (registrationNumber, studentName) => {
    if (!window.confirm(`Delete record for "${studentName || registrationNumber}"? This cannot be undone.`)) {
      return;
    }
    try {
      setDeletingRegistrationNumber(registrationNumber);
      setError(null);
      await axios.delete(`${API_URL}/api/students-data/single`, {
        data: { registrationNumber },
      });
      await fetchStudentsData();
      if (editingRegistrationNumber === registrationNumber) {
        setEditingRegistrationNumber(null);
        setEditForm({ studentName: '', fathersName: '', grade: '', dateOfBirth: '' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete record.';
      alert(msg);
    } finally {
      setDeletingRegistrationNumber(null);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) setSelectedRegistrationNumbers(new Set());
  };

  const toggleStudentSelection = (registrationNumber) => {
    setSelectedRegistrationNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(registrationNumber)) next.delete(registrationNumber);
      else next.add(registrationNumber);
      return next;
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRegistrationNumbers(new Set(studentsData.map((s) => s.registrationNumber).filter(Boolean)));
    } else {
      setSelectedRegistrationNumbers(new Set());
    }
  };

  const handleDeleteSelected = async () => {
    const regNums = Array.from(selectedRegistrationNumbers);
    if (regNums.length === 0) return;
    if (!window.confirm(`Delete ${regNums.length} selected student(s)? This cannot be undone.`)) return;
    try {
      setDeletingSelected(true);
      setError(null);
      await axios.delete(`${API_URL}/api/students-data/selected`, {
        data: { registrationNumbers: regNums },
      });
      await fetchStudentsData();
      setSelectedRegistrationNumbers(new Set());
      setSelectionMode(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete selected.';
      alert(msg);
    } finally {
      setDeletingSelected(false);
    }
  };


  if (loading && studentsData.length === 0) {
    return (
      <div className="student-data-container">
        <CurriculumHeader onCreateCourseClick={handleCreateCourseClick} />
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading students data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="student-data-container">
      <CurriculumHeader onCreateCourseClick={handleCreateCourseClick} />
      <div className="student-data-header">
        <h2>Students Data Management</h2>
        <p>Upload and manage student information in bulk</p>
      </div>

      <div className="add-student-section">
        <h3 className="add-student-title">Add student individually</h3>
        <p className="upload-requirements upload-requirements-above">
          Strictly follow this format and order of columns in your Excel file: Registration Number, Student Name, Fathers Name, Grade, Date of Birth.
        </p>
        {addError && (
          <div className="add-error-message" role="alert">
            <strong>Error:</strong> {addError.message}
            {addError.solution && (
              <p className="add-error-solution">{addError.solution}</p>
            )}
          </div>
        )}
        {uploadError && (
          <div className="upload-error-message" role="alert">
            <strong>Upload error:</strong> {uploadError.message}
            {uploadError.solution && (
              <p className="upload-error-solution">{uploadError.solution}</p>
            )}
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
              <label htmlFor="add-studentName">Student Name</label>
              <input
                id="add-studentName"
                type="text"
                value={addForm.studentName}
                onChange={(e) => handleAddFormChange('studentName', e.target.value)}
                placeholder="Student Name"
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
            {addingStudent ? 'Adding...' : 'Add Student'}
          </button>
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
          >
            {uploading ? 'Uploading...' : 'Upload file'}
          </button>
        </form>
      </div>

      {error && !uploading && (
        <div className="error-message">
          {error}
        </div>
      )}

      {studentsData.length > 0 && (
        <div className="students-table-section">
          <div className="students-table-header-row">
            <h3>Students Data ({studentsData.length} records)</h3>
            <div className="table-actions">
              <button
                type="button"
                className={selectionMode ? 'select-mode-btn active' : 'select-mode-btn'}
                onClick={toggleSelectionMode}
                disabled={deletingAll || deletingSelected}
              >
                {selectionMode ? 'Cancel' : 'Select'}
              </button>
              {selectionMode && (
                <button
                  type="button"
                  className="delete-selected-btn"
                  onClick={handleDeleteSelected}
                  disabled={selectedRegistrationNumbers.size === 0 || deletingSelected}
                >
                  {deletingSelected ? 'Deleting...' : `Delete selected (${selectedRegistrationNumbers.size})`}
                </button>
              )}
              <button
                type="button"
                className="delete-all-btn"
                onClick={handleDeleteAll}
                disabled={deletingAll || deletingSelected || selectionMode}
              >
                {deletingAll ? 'Deleting...' : 'Delete all data'}
              </button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  {selectionMode && (
                    <th className="checkbox-cell">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={studentsData.length > 0 && selectedRegistrationNumbers.size === studentsData.length}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </th>
                  )}
                  <th>Registration Number</th>
                  <th>Student Name</th>
                  <th>Fathers Name</th>
                  <th>Grade</th>
                  <th>Date of Birth</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentsData.map((student, index) => {
                  const isEditing = editingRegistrationNumber === student.registrationNumber;
                  const isSaving = savingRegistrationNumber === student.registrationNumber;
                  const isSelected = selectedRegistrationNumbers.has(student.registrationNumber);
                  return (
                    <tr key={student.registrationNumber || index} className={isEditing ? 'editing-row' : ''}>
                      {selectionMode && (
                        <td className="checkbox-cell">
                          <input
                            type="checkbox"
                            aria-label={`Select ${student.registrationNumber || student.studentName}`}
                            checked={isSelected}
                            onChange={() => toggleStudentSelection(student.registrationNumber)}
                          />
                        </td>
                      )}
                      <td>{student.registrationNumber || '-'}</td>
                      {isEditing ? (
                        <>
                          <td>
                            <input
                              type="text"
                              className="student-edit-input"
                              value={editForm.studentName}
                              onChange={(e) => handleEditFormChange('studentName', e.target.value)}
                              placeholder="Student Name"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="student-edit-input"
                              value={editForm.fathersName}
                              onChange={(e) => handleEditFormChange('fathersName', e.target.value)}
                              placeholder="Fathers Name"
                            />
                          </td>
                          <td>
                            <input
                              type="text"
                              className="student-edit-input"
                              value={editForm.grade}
                              onChange={(e) => handleEditFormChange('grade', e.target.value)}
                              placeholder="Grade"
                            />
                          </td>
                          <td>
                            <input
                              type="date"
                              className="student-edit-input"
                              value={editForm.dateOfBirth}
                              onChange={(e) => handleEditFormChange('dateOfBirth', e.target.value)}
                            />
                          </td>
                          <td>
                            <button
                              type="button"
                              className="save-record-btn"
                              onClick={() => handleSaveClick(student.registrationNumber)}
                              disabled={isSaving}
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            {!isSaving && (
                              <button
                                type="button"
                                className="cancel-edit-btn"
                                onClick={handleCancelEdit}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td>{student.studentName || '-'}</td>
                          <td>{student.fathersName || '-'}</td>
                          <td>{student.grade || '-'}</td>
                          <td>
                            {student.dateOfBirth
                              ? new Date(student.dateOfBirth).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : '-'}
                          </td>
                          <td>
                            <button
                              type="button"
                              className="edit-record-btn icon-btn"
                              onClick={() => handleEditClick(student)}
                              title="Edit"
                              aria-label="Edit"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="delete-record-btn icon-btn"
                              onClick={() => handleDeleteOne(student.registrationNumber, student.studentName)}
                              disabled={deletingRegistrationNumber === student.registrationNumber}
                              title={deletingRegistrationNumber === student.registrationNumber ? 'Deleting...' : 'Delete'}
                              aria-label={deletingRegistrationNumber === student.registrationNumber ? 'Deleting...' : 'Delete'}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && studentsData.length === 0 && (
        <div className="empty-state">
          <p>No students data available. Upload an Excel file to get started.</p>
        </div>
      )}
    </div>
  );
};

export default StudentData;
