import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './StudentReportDetail.css';

const StudentReportDetail = () => {
  const { registrationNumber } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const studentFromState = location.state?.student;

  const [student, setStudent] = useState(studentFromState || null);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resolve student: from state or find in fetched students by registration number
  useEffect(() => {
    if (studentFromState && studentFromState.registrationNumber === registrationNumber) {
      setStudent(studentFromState);
    }
  }, [studentFromState, registrationNumber]);

  useEffect(() => {
    const fetchData = async () => {
      if (!registrationNumber) return;
      try {
        setLoading(true);
        setError(null);

        const [coursesRes, recordsRes, studentsRes] = await Promise.all([
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/records`),
          axios.get(`${API_URL}/api/students-data`),
        ]);

        const coursesList = coursesRes.data?.success ? coursesRes.data.data || [] : [];
        const recordsList = recordsRes.data?.success ? recordsRes.data.data || [] : [];
        const studentsList = Array.isArray(studentsRes.data) ? studentsRes.data : [];

        setCourses(coursesList);
        setRecords(recordsList);
        setStudents(studentsList);

        if (!student && studentsList.length > 0) {
          const found = studentsList.find(
            (s) => String(s.registrationNumber) === String(registrationNumber)
          );
          setStudent(found || null);
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [registrationNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enrolled courses: course has topics with grades that include this student's grade
  const enrolledCoursesWithMarks = useMemo(() => {
    const studentGrade = student?.grade != null ? String(student.grade) : null;
    if (!studentGrade || !Array.isArray(courses)) return [];

    const recordByCode = {};
    (records || []).forEach((r) => {
      recordByCode[r.courseCode] = r;
    });

    return courses
      .filter((course) => {
        const topics = course.topics || [];
        const courseGrades = new Set();
        topics.forEach((t) => {
          if (t.grade != null && t.grade !== '') courseGrades.add(String(t.grade));
        });
        if (courseGrades.size === 0) return true; // no grade info → treat as enrolled
        return courseGrades.has(studentGrade);
      })
      .map((course) => {
        const record = recordByCode[course.code] || null;
        const studentEntry = record?.students?.find(
          (s) => String(s.registrationNumber) === String(registrationNumber)
        );
        const objectiveMarks = studentEntry?.objectiveMarks || {};
        return { course, record, objectiveMarks };
      });
  }, [courses, records, student, registrationNumber]);

  const handleBack = () => {
    navigate('/reports');
  };

  if (loading) {
    return (
      <div className="student-report-detail-container">
        <CurriculumHeader />
        <div className="student-report-detail-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="student-report-detail-container">
        <CurriculumHeader />
        <div className="student-report-detail-error">{error}</div>
        <button type="button" className="student-report-detail-back-btn" onClick={handleBack}>
          Back to Reports
        </button>
      </div>
    );
  }

  const displayName = student?.studentName || 'Student';
  const displayRegNo = registrationNumber || '—';

  return (
    <div className="student-report-detail-container">
      <CurriculumHeader />
      <div className="student-report-detail-content">
        <div className="student-report-detail-header">
          <h2 className="student-report-detail-title">
            Report: {displayName} ({displayRegNo})
          </h2>
          <button type="button" className="student-report-detail-back-btn" onClick={handleBack}>
            Back to Reports
          </button>
        </div>

        {enrolledCoursesWithMarks.length === 0 ? (
          <p className="student-report-detail-empty">
            No courses found in which this student is enrolled, or no data to display.
          </p>
        ) : (
          <div className="student-report-detail-sections">
            {enrolledCoursesWithMarks.map(({ course, objectiveMarks }) => (
              <section key={course.code || course._id} className="student-report-course-section">
                <h3 className="student-report-course-heading">{course.courseName || course.code}</h3>
                <div className="student-report-table-wrapper">
                  <table className="student-report-objectives-table">
                    <thead>
                      <tr>
                        <th className="student-report-th">Objective</th>
                        <th className="student-report-th">Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(course.topics || []).map((topic, topicIndex) => {
                        const marks = objectiveMarks[String(topicIndex)];
                        const displayMarks =
                          marks !== undefined && marks !== null
                            ? Number(marks).toFixed(2)
                            : '—';
                        return (
                          <tr key={topicIndex}>
                            <td className="student-report-td student-report-td-objective">
                              {topic.topicName || topic.courseCode || `Objective ${topicIndex + 1}`}
                            </td>
                            <td className="student-report-td student-report-td-marks">
                              {displayMarks}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentReportDetail;
