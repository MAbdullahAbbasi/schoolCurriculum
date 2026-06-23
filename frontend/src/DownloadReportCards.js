import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_URL } from './config/api';
import { IconDownload } from './ButtonIcons';
import {
  buildStudentReportData,
  normalizeGradingSchemeRows,
  filterCoursesForReport,
  formatGradingSchemeOptionLabel,
} from './reportUtils';
import { buildReportCardsPdfBlob } from './downloadReportCardsPdf';
import './Reports.css';

const gradeSortOrder = (g) => {
  const s = String(g).trim();
  if (/^KG[- ]?1$/i.test(s) || /^KG[- ]?I$/i.test(s)) return 0;
  if (/^KG[- ]?2$/i.test(s) || /^KG[- ]?II$/i.test(s)) return 1;
  if (/^KG[- ]?3$/i.test(s) || /^KG[- ]?III$/i.test(s)) return 2;
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return 100;
  return 10 + n;
};

const DownloadReportCards = () => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [gradingSchemes, setGradingSchemes] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedGradingSchemeId, setSelectedGradingSchemeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  const gradesFromDb = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.grade != null && String(s.grade).trim() !== '') set.add(String(s.grade).trim());
    });
    return Array.from(set).sort((a, b) => gradeSortOrder(a) - gradeSortOrder(b));
  }, [students]);

  const selectedGradingScheme = useMemo(() => {
    if (!selectedGradingSchemeId) return null;
    return gradingSchemes.find((s) => String(s._id) === String(selectedGradingSchemeId)) || null;
  }, [gradingSchemes, selectedGradingSchemeId]);

  const selectedGradingSchemeRows = useMemo(
    () => normalizeGradingSchemeRows(selectedGradingScheme?.rows || []),
    [selectedGradingScheme]
  );

  const studentsInGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const gradeStr = String(selectedGrade);
    return students
      .filter((s) => String(s.grade) === gradeStr)
      .sort((a, b) => {
        const nameA = (a.studentName || '').toLowerCase();
        const nameB = (b.studentName || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
      });
  }, [students, selectedGrade]);

  const sessionCourseCodesForGrade = useMemo(() => {
    if (!selectedGrade || !selectedGradingScheme) return [];
    return filterCoursesForReport(courses, {
      grade: selectedGrade,
      gradingScheme: selectedGradingScheme,
    })
      .map((c) => c.code)
      .filter(Boolean);
  }, [courses, selectedGrade, selectedGradingScheme]);

  const courseCodesForGrade = useMemo(() => {
    if (!selectedGrade || !selectedGradingSchemeId) return [];
    return filterCoursesForReport(courses, {
      grade: selectedGrade,
      gradingScheme: selectedGradingScheme,
      recordsByCourse,
    })
      .map((c) => c.code)
      .filter(Boolean);
  }, [courses, selectedGrade, selectedGradingSchemeId, selectedGradingScheme, recordsByCourse]);

  const canGenerate =
    selectedGrade &&
    selectedGradingSchemeId &&
    courseCodesForGrade.length > 0 &&
    studentsInGrade.length > 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [studentsRes, coursesRes, gradingSchemesRes, curriculumRes] = await Promise.all([
          axios.get(`${API_URL}/api/students-data`),
          axios.get(`${API_URL}/api/courses`),
          axios.get(`${API_URL}/api/grading-schemes`),
          axios.get(`${API_URL}/api/curriculum`).catch(() => ({ data: [] })),
        ]);
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.data || []));
        setCourses(coursesRes.data?.success ? (coursesRes.data.data || []) : []);
        setGradingSchemes(gradingSchemesRes.data?.success ? gradingSchemesRes.data.data || [] : []);
        setCurriculumList(Array.isArray(curriculumRes.data) ? curriculumRes.data : []);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedGrade || sessionCourseCodesForGrade.length === 0) {
      setRecordsByCourse({});
      return;
    }
    let cancelled = false;
    const fetchRecords = async () => {
      const byCourse = {};
      await Promise.all(
        sessionCourseCodesForGrade.map(async (code) => {
          if (cancelled) return;
          try {
            const res = await axios.get(`${API_URL}/api/records/course/${encodeURIComponent(code)}`);
            if (res.data?.success && res.data.data) byCourse[code] = res.data.data;
          } catch {
            // no record
          }
        })
      );
      if (!cancelled) setRecordsByCourse(byCourse);
    };
    fetchRecords();
    return () => { cancelled = true; };
  }, [selectedGrade, sessionCourseCodesForGrade]);

  const fetchAllRecordsForGrade = async (courseCodes) => {
    const byCourse = {};
    for (const code of courseCodes) {
      try {
        const res = await axios.get(`${API_URL}/api/records/course/${encodeURIComponent(code)}`);
        if (res.data?.success && res.data.data) byCourse[code] = res.data.data;
      } catch (e) {
        console.warn(`Failed to fetch record for ${code}:`, e?.message || e);
      }
    }
    return byCourse;
  };

  const handleDownloadPdf = async () => {
    if (!canGenerate) return;
    try {
      setGenerating(true);
      setError(null);
      const records = await fetchAllRecordsForGrade(courseCodesForGrade);
      const reportDataList = studentsInGrade.map((student) =>
        buildStudentReportData({
          student,
          allStudents: students,
          courses,
          recordsByCourse: records,
          gradingSchemeRows: selectedGradingSchemeRows,
          gradingScheme: selectedGradingScheme,
          registrationNumber: student.registrationNumber,
          curriculumList,
        })
      );
      const blob = await buildReportCardsPdfBlob(reportDataList);
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const sessionLabel = (selectedGradingScheme?.name || 'session').replace(/[\\/:*?"<>|]/g, '-');
      link.download = `Report-Cards-Grade-${selectedGrade}-${sessionLabel}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Error generating report cards PDF:', err);
      setError(err?.message || 'Failed to generate report cards PDF.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="reports-container">
        <div className="reports-loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-content">
        <div className="page-local-header-block">
          <h2 className="reports-title">Download Report Cards</h2>
          <p className="reports-subtitle">
            Select grade and exam session, then download a PDF with all students&apos; report cards (2 per page).
          </p>
        </div>

        {error && <div className="reports-error">{error}</div>}

        <div className="reports-filters">
          <div className="reports-select-wrapper">
            <label htmlFor="rc-grade-select" className="reports-select-label">Grade</label>
            <select
              id="rc-grade-select"
              className="reports-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="">Select a grade</option>
              {gradesFromDb.map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>

          <div className="reports-select-wrapper">
            <label htmlFor="rc-scheme-select" className="reports-select-label">Exam session (grading scheme)</label>
            <select
              id="rc-scheme-select"
              className="reports-select"
              value={selectedGradingSchemeId}
              onChange={(e) => setSelectedGradingSchemeId(e.target.value)}
              disabled={gradingSchemes.length === 0}
            >
              {gradingSchemes.length === 0 ? (
                <option value="">No grading schemes defined</option>
              ) : (
                <>
                  <option value="">Select a grading scheme</option>
                  {gradingSchemes.map((scheme) => (
                    <option key={scheme._id} value={String(scheme._id)}>
                      {formatGradingSchemeOptionLabel(scheme)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {!selectedGrade && (
          <div className="reports-prompt">Please select a grade and grading scheme to download report cards.</div>
        )}

        {selectedGrade && gradingSchemes.length > 0 && !selectedGradingSchemeId && (
          <div className="reports-prompt">Please select a grading scheme (exam session).</div>
        )}

        {selectedGrade && selectedGradingSchemeId && sessionCourseCodesForGrade.length > 0 && courseCodesForGrade.length === 0 && (
          <div className="reports-prompt reports-prompt-warning">
            No saved marks found for this grade and session. Enter marks from the Record page first.
          </div>
        )}

        {selectedGrade && selectedGradingSchemeId && sessionCourseCodesForGrade.length === 0 && (
          <div className="reports-prompt reports-prompt-warning">
            No courses match this session for Grade {selectedGrade}. Courses before March use February; from March use May (by starting date).
          </div>
        )}

        {canGenerate && (
          <div className="reports-download-all-wrapper">
            <p className="reports-prompt" style={{ marginBottom: '1rem' }}>
              {studentsInGrade.length} student{studentsInGrade.length === 1 ? '' : 's'} — PDF will have 2 report cards per page.
            </p>
            <button
              type="button"
              className="reports-download-all-btn"
              onClick={handleDownloadPdf}
              disabled={generating}
            >
              <span className="btn-icon-wrap">
                <IconDownload />
                {generating ? 'Preparing PDF...' : 'Download Report Cards PDF'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DownloadReportCards;
