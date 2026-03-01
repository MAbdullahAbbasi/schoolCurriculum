import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './StudentReportDetail.css';

const GRADING_SCHEME_STORAGE_KEY = 'curriculum_grading_scheme';

const getGradingSchemeFromStorage = () => {
  try {
    const raw = localStorage.getItem(GRADING_SCHEME_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const StudentReportDetail = () => {
  const { registrationNumber } = useParams();
  const decodedRegNo = decodeURIComponent(registrationNumber || '');
  const navigate = useNavigate();
  const location = useLocation();
  const studentFromState = location.state?.student;

  const [student, setStudent] = useState(studentFromState || null);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Resolve student: from state or find in fetched students by registration number
  useEffect(() => {
    if (studentFromState && String(studentFromState.registrationNumber) === decodedRegNo) {
      setStudent(studentFromState);
    }
  }, [studentFromState, decodedRegNo]);

  useEffect(() => {
    const fetchData = async () => {
      if (!decodedRegNo) return;
      try {
        setLoading(true);
        setError(null);

        const [coursesRes, studentsRes] = await Promise.all([
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/students-data`),
        ]);

        const coursesList = coursesRes.data?.success ? coursesRes.data.data || [] : [];
        const studentsList = Array.isArray(studentsRes.data) ? studentsRes.data : [];

        setCourses(coursesList);

        let currentStudent = studentFromState && String(studentFromState.registrationNumber) === decodedRegNo
          ? studentFromState
          : studentsList.find((s) => String(s.registrationNumber) === decodedRegNo) || null;
        setStudent(currentStudent);

        if (!currentStudent) {
          setLoading(false);
          return;
        }

        const studentGrade = currentStudent.grade != null ? String(currentStudent.grade) : null;
        if (!studentGrade) {
          setLoading(false);
          return;
        }

        const enrolledCodes = coursesList
          .filter((course) => {
            const topics = course.topics || [];
            const courseGrades = new Set();
            topics.forEach((t) => {
              if (t.grade != null && t.grade !== '') courseGrades.add(String(t.grade));
            });
            if (courseGrades.size === 0) return true;
            return courseGrades.has(studentGrade);
          })
          .map((c) => c.code)
          .filter(Boolean);

        const byCourse = {};
        await Promise.all(
          enrolledCodes.map(async (code) => {
            try {
              const res = await axios.get(
                `${API_URL}/api/records/course/${encodeURIComponent(code)}`
              );
              if (res.data?.success && res.data.data) {
                byCourse[code] = res.data.data;
              }
            } catch (e) {
              // no record for this course is ok
            }
          })
        );
        setRecordsByCourse(byCourse);
      } catch (err) {
        console.error('Error fetching report data:', err);
        setError('Failed to load report data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [decodedRegNo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enrolled courses: course has topics with grades that include this student's grade
  const enrolledCoursesWithMarks = useMemo(() => {
    const studentGrade = student?.grade != null ? String(student.grade) : null;
    if (!studentGrade || !Array.isArray(courses)) return [];

    return courses
      .filter((course) => {
        const topics = course.topics || [];
        const courseGrades = new Set();
        topics.forEach((t) => {
          if (t.grade != null && t.grade !== '') courseGrades.add(String(t.grade));
        });
        if (courseGrades.size === 0) return true;
        return courseGrades.has(studentGrade);
      })
      .map((course) => {
        const record = recordsByCourse[course.code] || null;
        const studentEntry = record?.students?.find(
          (s) => String(s.registrationNumber) === decodedRegNo
        );
        const objectiveMarks = studentEntry?.objectiveMarks || {};
        return { course, record, objectiveMarks };
      });
  }, [courses, recordsByCourse, student, decodedRegNo]);

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
  const displayRegNo = decodedRegNo || '—';
  const gradingSchemeRows = getGradingSchemeFromStorage();

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
                        <th className="student-report-th">Total marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(course.topics || []).map((topic, topicIndex) => {
                        const marks = objectiveMarks[String(topicIndex)];
                        const displayMarks =
                          marks !== undefined && marks !== null
                            ? Number(marks).toFixed(2)
                            : '—';
                        const totalMarks = topic.marks != null && topic.marks !== '' ? Number(topic.marks) : null;
                        return (
                          <tr key={topicIndex}>
                            <td className="student-report-td student-report-td-objective">
                              {topic.topicName || topic.courseCode || `Objective ${topicIndex + 1}`}
                            </td>
                            <td className="student-report-td student-report-td-marks">
                              {displayMarks}
                            </td>
                            <td className="student-report-td student-report-td-total-marks">
                              {totalMarks != null ? totalMarks : '—'}
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

        <section className="student-report-grading-scheme-section">
          <h3 className="student-report-grading-scheme-heading">Grading Scheme</h3>
          {gradingSchemeRows.length === 0 ? (
            <p className="student-report-grading-scheme-empty">
              No grading scheme defined. You can define one from the Grading Scheme page in the menu.
            </p>
          ) : (
            <div className="student-report-grading-scheme-table-wrapper">
              <table className="student-report-grading-scheme-table">
                <thead>
                  <tr>
                    <th className="student-report-th">Marks</th>
                    <th className="student-report-th">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {gradingSchemeRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="student-report-td">{row.marks !== undefined && row.marks !== null ? String(row.marks) : '—'}</td>
                      <td className="student-report-td">{row.grade !== undefined && row.grade !== null ? String(row.grade) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentReportDetail;
