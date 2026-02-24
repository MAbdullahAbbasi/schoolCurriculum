import React, { useState, useEffect } from 'react';
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
  const [editForm, setEditForm] = useState({ studentName: '', grade: '', dateOfBirth: '' });
  const [savingRegistrationNumber, setSavingRegistrationNumber] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deletingRegistrationNumber, setDeletingRegistrationNumber] = useState(null);

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
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (validTypes.includes(selectedFile.type) || 
          selectedFile.name.endsWith('.xlsx') || 
          selectedFile.name.endsWith('.xls') || 
          selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please upload a valid Excel file (.xlsx, .xls, or .csv)');
        setFile(null);
      }
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
      grade: student.grade || '',
      dateOfBirth: dob,
    });
  };

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCancelEdit = () => {
    setEditingRegistrationNumber(null);
    setEditForm({ studentName: '', grade: '', dateOfBirth: '' });
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
        grade: editForm.grade.trim(),
        dateOfBirth: editForm.dateOfBirth,
      });
      await fetchStudentsData();
      setEditingRegistrationNumber(null);
      setEditForm({ studentName: '', grade: '', dateOfBirth: '' });
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
        setEditForm({ studentName: '', grade: '', dateOfBirth: '' });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete record.';
      alert(msg);
    } finally {
      setDeletingRegistrationNumber(null);
    }
  };

  const handleFileUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setError(null);

      const response = await axios.post(`${API_URL}/api/students-data/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        alert('Data has been uploaded successfully!');
        // Refresh the students data table
        await fetchStudentsData();
        // Reset file input
        setFile(null);
        document.getElementById('file-input').value = '';
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to upload file';
      alert(`Upload failed: ${errorMessage}`);
      setError(errorMessage);
      // Still fetch existing data to display
      await fetchStudentsData();
    } finally {
      setUploading(false);
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

      <div className="upload-section">
        <div className="upload-box">
          <label htmlFor="file-input" className="upload-label">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              <strong>Upload Students Data in Bulk</strong>
              <span className="upload-hint">Click to select Excel file (.xlsx, .xls, or .csv)</span>
              <span className="upload-requirements">
                Required columns: Registration Number, Student Name, Grade, Date of Birth
              </span>
            </div>
          </label>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="file-input"
            disabled={uploading}
          />
          {file && (
            <div className="file-info">
              <span className="file-name">Selected: {file.name}</span>
              <button
                className="upload-button"
                onClick={handleFileUpload}
                disabled={uploading}
              >
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          )}
        </div>
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
            <button
              type="button"
              className="delete-all-btn"
              onClick={handleDeleteAll}
              disabled={deletingAll}
            >
              {deletingAll ? 'Deleting...' : 'Delete all data'}
            </button>
          </div>
          <div className="table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Registration Number</th>
                  <th>Student Name</th>
                  <th>Grade</th>
                  <th>Date of Birth</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {studentsData.map((student, index) => {
                  const isEditing = editingRegistrationNumber === student.registrationNumber;
                  const isSaving = savingRegistrationNumber === student.registrationNumber;
                  return (
                    <tr key={student.registrationNumber || index} className={isEditing ? 'editing-row' : ''}>
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
                              className="edit-record-btn"
                              onClick={() => handleEditClick(student)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-record-btn"
                              onClick={() => handleDeleteOne(student.registrationNumber, student.studentName)}
                              disabled={deletingRegistrationNumber === student.registrationNumber}
                            >
                              {deletingRegistrationNumber === student.registrationNumber ? 'Deleting...' : 'Delete'}
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
