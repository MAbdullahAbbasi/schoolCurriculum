import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
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

  // Fetch existing students data on component mount
  useEffect(() => {
    fetchStudentsData();
  }, []);

  const fetchStudentsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/students-data');
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

      const response = await axios.post('http://localhost:5000/api/students-data/upload', formData, {
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
          <h3>Students Data ({studentsData.length} records)</h3>
          <div className="table-wrapper">
            <table className="students-table">
              <thead>
                <tr>
                  <th>Registration Number</th>
                  <th>Student Name</th>
                  <th>Grade</th>
                  <th>Date of Birth</th>
                </tr>
              </thead>
              <tbody>
                {studentsData.map((student, index) => (
                  <tr key={index}>
                    <td>{student.registrationNumber || '-'}</td>
                    <td>{student.studentName || '-'}</td>
                    <td>{student.grade || '-'}</td>
                    <td>
                      {student.dateOfBirth 
                        ? new Date(student.dateOfBirth).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })
                        : '-'}
                    </td>
                  </tr>
                ))}
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
