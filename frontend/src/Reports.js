import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './Reports.css';

const downloadIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const Reports = () => {
  const [courses, setCourses] = useState([]);
  const [selectedCourseCode, setSelectedCourseCode] = useState('');
  const [students, setStudents] = useState([]);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [error, setError] = useState(null);

  const selectedCourse = useMemo(
    () => courses.find((c) => c.code === selectedCourseCode),
    [courses, selectedCourseCode]
  );

  const topics = useMemo(() => selectedCourse?.topics || [], [selectedCourse]);
  const totalMarksForCourse = useMemo(
    () => topics.reduce((sum, t) => sum + (t.marks || 0), 0),
    [topics]
  );

  const courseGrades = useMemo(() => {
    const grades = new Set();
    topics.forEach((t) => {
      if (t.grade != null && t.grade !== '') grades.add(String(t.grade));
    });
    return grades;
  }, [topics]);

  const enrolledStudents = useMemo(() => {
    if (courseGrades.size === 0) return students;
    return students.filter((s) => courseGrades.has(String(s.grade)));
  }, [students, courseGrades]);

  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        setError(null);
        const [coursesRes, studentsRes] = await Promise.all([
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/students-data`),
        ]);
        if (coursesRes.data?.success && Array.isArray(coursesRes.data.data)) {
          setCourses(coursesRes.data.data);
        }
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : []);
      } catch (err) {
        console.error('Error fetching reports data:', err);
        setError('Failed to load courses and students.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  useEffect(() => {
    if (!selectedCourseCode) {
      setRecord(null);
      return;
    }
    const fetchRecord = async () => {
      try {
        setLoadingRecord(true);
        const res = await axios.get(`${API_URL}/api/records/course/${selectedCourseCode}`);
        if (res.data?.success && res.data?.data) {
          setRecord(res.data.data);
        } else {
          setRecord(null);
        }
      } catch {
        setRecord(null);
      } finally {
        setLoadingRecord(false);
      }
    };
    fetchRecord();
  }, [selectedCourseCode]);

  const getMarkForStudent = (registrationNumber, topicIndex) => {
    if (!record?.students) return '';
    const student = record.students.find((s) => s.registrationNumber === registrationNumber);
    const om = student?.objectiveMarks || {};
    const v = om[String(topicIndex)];
    return v === undefined || v === null ? '' : String(v);
  };

  const triggerDownload = (filename, csvContent) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleDownloadReport = (student) => {
    if (!selectedCourse || !student || topics.length === 0) return;
    const headers = ['Objective', 'Max Marks', 'Marks'];
    const rows = topics.map((topic, topicIndex) => {
      const name = topic.topicName || topic.courseCode || `Objective ${topicIndex + 1}`;
      const maxMarks = topic.marks != null ? String(topic.marks) : '';
      const mark = getMarkForStudent(student.registrationNumber, topicIndex);
      return [name, maxMarks, mark !== '' ? mark : '-'];
    });
    const total = topics.reduce(
      (sum, _, idx) => sum + (parseFloat(getMarkForStudent(student.registrationNumber, idx)) || 0),
      0
    );
    const totalRow = ['Total', totalMarksForCourse, total.toFixed(2)];
    const csvRows = [
      headers.join(','),
      ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')),
      totalRow.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
    ];
    const filename = `${selectedCourse.courseName || selectedCourseCode}_${student.studentName}_${student.registrationNumber}.csv`.replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    triggerDownload(filename, '\uFEFF' + csvRows.join('\r\n'));
  };

  if (loading) {
    return (
      <div className="reports-container">
        <CurriculumHeader />
        <div className="reports-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <CurriculumHeader />
        <div className="reports-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <CurriculumHeader />
      <div className="reports-content">
        <h2 className="reports-title">Reports</h2>
        <p className="reports-subtitle">Select a course to view and download student reports.</p>

        <div className="reports-select-wrapper">
          <label htmlFor="reports-course-select" className="reports-select-label">
            Course
          </label>
          <select
            id="reports-course-select"
            className="reports-select"
            value={selectedCourseCode}
            onChange={(e) => setSelectedCourseCode(e.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map((c) => (
              <option key={c.code} value={c.code}>
                {c.courseName || c.code} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {!selectedCourseCode && (
          <div className="reports-prompt">Please select a course above to view student reports.</div>
        )}

        {selectedCourseCode && (
          <>
            {loadingRecord ? (
              <div className="reports-loading">Loading course data...</div>
            ) : (
              <div className="reports-table-wrapper">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th className="reports-th">Registration Number</th>
                      <th className="reports-th">Name</th>
                      <th className="reports-th reports-th-report">Report.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="reports-empty-cell">
                          No students in this course&apos;s grade(s).
                        </td>
                      </tr>
                    ) : (
                      enrolledStudents.map((student) => (
                        <tr key={student.registrationNumber}>
                          <td className="reports-td">{student.registrationNumber}</td>
                          <td className="reports-td">{student.studentName}</td>
                          <td className="reports-td reports-td-report">
                            <button
                              type="button"
                              className="reports-download-btn"
                              onClick={() => handleDownloadReport(student)}
                              title={`Download report for ${student.studentName}`}
                              aria-label={`Download report for ${student.studentName}`}
                            >
                              {downloadIcon}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
