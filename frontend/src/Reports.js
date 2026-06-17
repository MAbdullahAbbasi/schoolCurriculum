import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { createRoot } from 'react-dom/client';
import { API_URL } from './config/api';
import { IconDownload, IconList, IconView } from './ButtonIcons';
import {
  StudentReportCover,
  StudentReportGradingScheme,
  StudentReportMarksheet,
  StudentReportObjectiveSection,
} from './StudentReportDocument';
import {
  buildStudentReportData,
  normalizeGradingSchemeRows,
  getCourseTotalMarks,
  getGradeFromPercentageWithScheme,
  formatDateDisplay,
  filterCoursesForReport,
} from './reportUtils';
import logoLeft from './assets/logoleft.jpg';
import './Reports.css';

const getWatermarkDataUrl = () =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.globalAlpha = 0.06;
      ctx.drawImage(img, 0, 0);
      resolve(c.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = logoLeft;
  });

const formatGradingSchemeOptionLabel = (scheme) => {
  const name = String(scheme?.name || 'Grading scheme').trim();
  const start = formatDateDisplay(scheme?.startDate);
  const end = formatDateDisplay(scheme?.endDate);
  if (start !== '—' && end !== '—') return `${name} (${start} – ${end})`;
  if (start !== '—') return `${name} (from ${start})`;
  return name;
};

const gradeFromPercentage = (percentage, schemeRows) =>
  getGradeFromPercentageWithScheme(percentage, schemeRows);

// Sort order: KG classes first, then numeric grades ascending
const gradeSortOrder = (g) => {
  const s = String(g).trim();
  if (/^KG[- ]?1$/i.test(s) || /^KG[- ]?I$/i.test(s)) return 0;
  if (/^KG[- ]?2$/i.test(s) || /^KG[- ]?II$/i.test(s)) return 1;
  if (/^KG[- ]?3$/i.test(s) || /^KG[- ]?III$/i.test(s)) return 2;
  const n = parseInt(s, 10);
  if (Number.isNaN(n)) return 100;
  return 10 + n;
};

const Reports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [gradingSchemes, setGradingSchemes] = useState([]);
  const [selectedGradingSchemeId, setSelectedGradingSchemeId] = useState(
    () => location.state?.selectedGradingSchemeId || ''
  );
  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState(() => location.state?.selectedGrade || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingRegNo, setDownloadingRegNo] = useState('');
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Grades present in DB (from students), sorted: KG first, then 1–10
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

  const selectedGradingSchemeRows = useMemo(() => {
    return normalizeGradingSchemeRows(selectedGradingScheme?.rows || []);
  }, [selectedGradingScheme]);

  const handleViewReport = (student) => {
    navigate(`/reports/student/${encodeURIComponent(student.registrationNumber)}`, {
      state: {
        student,
        gradingSchemeRows: selectedGradingSchemeRows,
        selectedGradingSchemeId,
        selectedGrade,
      },
    });
  };

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

  const allCourseCodesForGrade = useMemo(() => {
    if (!selectedGrade) return [];
    return filterCoursesForReport(courses, { grade: selectedGrade })
      .map((c) => c.code)
      .filter(Boolean);
  }, [courses, selectedGrade]);

  const courseCodesForGrade = useMemo(() => {
    if (!selectedGrade || !selectedGradingSchemeId) return [];
    return filterCoursesForReport(courses, {
      grade: selectedGrade,
      recordsByCourse,
    })
      .map((c) => c.code)
      .filter(Boolean);
  }, [courses, selectedGrade, selectedGradingSchemeId, recordsByCourse]);

  // Top 3 students by aggregate marks across all courses for this grade
  const topThreeStudents = useMemo(() => {
    if (!selectedGrade || studentsInGrade.length === 0) return [];
    const coursesList = (courses || []).filter((c) => courseCodesForGrade.includes(c.code));
    const rankList = studentsInGrade.map((student) => {
      let obtained = 0;
      let totalMax = 0;
      coursesList.forEach((course) => {
        const record = recordsByCourse[course.code];
        const entry = record?.students?.find((s) => String(s.registrationNumber) === String(student.registrationNumber));
        const courseTotal = getCourseTotalMarks(course);
        if (entry && courseTotal > 0) {
          const pct = Number(entry.overallPercentage);
          if (Number.isFinite(pct)) {
            obtained += (pct / 100) * courseTotal;
            totalMax += courseTotal;
          }
        }
      });
      const percentage = totalMax > 0 ? Math.round((obtained / totalMax) * 10000) / 100 : 0;
      const grade = gradeFromPercentage(percentage, selectedGradingSchemeRows);
      return { student, obtained: Math.round(obtained * 100) / 100, totalMax, percentage, grade };
    });
    rankList.sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.obtained !== a.obtained) return b.obtained - a.obtained;
      return (a.student.studentName || '').localeCompare(b.student.studentName || '');
    });
    return rankList.slice(0, 3);
  }, [selectedGrade, studentsInGrade, courses, courseCodesForGrade, recordsByCourse, selectedGradingSchemeRows]);

  useEffect(() => {
    const fetchStudentsAndCourses = async () => {
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
        const gradingSchemesList = gradingSchemesRes.data?.success ? gradingSchemesRes.data.data || [] : [];
        setGradingSchemes(gradingSchemesList);
        setCurriculumList(Array.isArray(curriculumRes.data) ? curriculumRes.data : []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load students.');
      } finally {
        setLoading(false);
      }
    };
    fetchStudentsAndCourses();
  }, []);

  useEffect(() => {
    if (!selectedGrade || allCourseCodesForGrade.length === 0) {
      setRecordsByCourse({});
      return;
    }
    let cancelled = false;
    const fetchRecords = async () => {
      const byCourse = {};
      await Promise.all(
        allCourseCodesForGrade.map(async (code) => {
          if (cancelled) return;
          try {
            const res = await axios.get(`${API_URL}/api/records/course/${encodeURIComponent(code)}`);
            if (res.data?.success && res.data.data) byCourse[code] = res.data.data;
          } catch {
            // no record for this course
          }
        })
      );
      if (!cancelled) setRecordsByCourse(byCourse);
    };
    fetchRecords();
    return () => { cancelled = true; };
  }, [selectedGrade, allCourseCodesForGrade]);

  // Fetch all course records sequentially (for Download All) to avoid partial failures from parallel requests
  const fetchAllRecordsForGrade = async (courseCodes) => {
    const byCourse = {};
    for (const code of courseCodes) {
      try {
        const res = await axios.get(`${API_URL}/api/records/course/${encodeURIComponent(code)}`);
        if (res.data?.success && res.data.data) byCourse[code] = res.data.data;
      } catch (e) {
        console.warn(`Failed to fetch record for course ${code}:`, e?.message || e);
      }
    }
    return byCourse;
  };

  const triggerBlobDownload = (filename, blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const getSerialFromRegistration = (registrationNumber) => {
    const parts = String(registrationNumber || '').split('-');
    return parts.length >= 2 ? parts[1].trim() : String(registrationNumber || '').trim();
  };

  const sanitizeNamePart = (value) =>
    String(value || '')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

  const waitForImages = async (container) => {
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );
  };

  const createPdfBlobForStudent = async (student, dataOverride = null) => {
    const records = dataOverride?.recordsByCourse ?? recordsByCourse;
    const reportData = buildStudentReportData({
      student,
      allStudents: dataOverride?.allStudents ?? students,
      courses: dataOverride?.courses ?? courses,
      recordsByCourse: records,
      gradingSchemeRows: dataOverride?.gradingSchemeRows ?? selectedGradingSchemeRows,
      registrationNumber: student.registrationNumber,
      curriculumList: dataOverride?.curriculumList ?? curriculumList,
    });

    const renderComponentToCanvas = async (element) => {
      const mountNode = document.createElement('div');
      mountNode.style.position = 'fixed';
      mountNode.style.left = '-10000px';
      mountNode.style.top = '0';
      mountNode.style.width = '900px';
      mountNode.style.background = '#ffffff';
      mountNode.style.zIndex = '-1';
      document.body.appendChild(mountNode);

      const root = createRoot(mountNode);
      root.render(element);
      await new Promise((resolve) => setTimeout(resolve, 300));
      await waitForImages(mountNode);
      const canvas = await html2canvas(mountNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      root.unmount();
      document.body.removeChild(mountNode);
      return canvas;
    };

    const pageWidth = 210;
    const pageHeight = 297;
    const marginX = 10;
    const marginY = 10;
    const footerY = pageHeight - 12;
    const usableWidth = pageWidth - marginX * 2;
    const usableHeight = pageHeight - marginY * 2 - 14;

    const getCanvasPageCount = (canvas) => {
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      return Math.ceil(imgHeight / usableHeight) || 1;
    };

    const firstSection = reportData.objectiveSections[0];
    const restSections = reportData.objectiveSections.slice(1);

    const coverAndFirstSectionCanvas = await renderComponentToCanvas(
      <div className="student-report-detail-content student-report-pdf-content">
        <StudentReportCover reportData={reportData} />
        {firstSection && <StudentReportObjectiveSection section={firstSection} />}
      </div>
    );
    const restSectionCanvases = await Promise.all(
      restSections.map((section) =>
        renderComponentToCanvas(
          <div className="student-report-detail-content student-report-pdf-content">
            <StudentReportObjectiveSection section={section} />
          </div>
        )
      )
    );
    const marksheetCanvas = await renderComponentToCanvas(
      <div className="student-report-detail-content student-report-pdf-content">
        <StudentReportMarksheet reportData={reportData} />
      </div>
    );
    const gradingCanvas = await renderComponentToCanvas(
      <div className="student-report-detail-content student-report-pdf-content">
        <StudentReportGradingScheme reportData={reportData} />
      </div>
    );

    const allCanvases = [coverAndFirstSectionCanvas, ...restSectionCanvases, marksheetCanvas, gradingCanvas];
    const totalPages = allCanvases.reduce((sum, c) => sum + getCanvasPageCount(c), 0);
    const watermarkDataUrl = await getWatermarkDataUrl();

    const pdf = new jsPDF('p', 'mm', 'a4');
    let currentPage = 0;

    const addCanvasToPdf = (canvas, addNewPage) => {
      const imgWidth = usableWidth;
      const imgHeightMm = (canvas.height * imgWidth) / canvas.width;
      const numPages = Math.ceil(imgHeightMm / usableHeight) || 1;

      for (let p = 0; p < numPages; p++) {
        const sliceTopMm = p * usableHeight;
        const sliceBottomMm = Math.min(sliceTopMm + usableHeight, imgHeightMm);
        const sliceHeightMm = sliceBottomMm - sliceTopMm;
        const sliceTopPx = (sliceTopMm / imgHeightMm) * canvas.height;
        const sliceHeightPx = (sliceHeightMm / imgHeightMm) * canvas.height;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.round(sliceHeightPx);
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, sliceTopPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
        const sliceData = sliceCanvas.toDataURL('image/png');

        if (addNewPage || currentPage > 0) pdf.addPage();
        currentPage += 1;
        pdf.setPage(currentPage);
        pdf.addImage(sliceData, 'PNG', marginX, marginY, imgWidth, sliceHeightMm);
        pdf.addImage(watermarkDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`-- ${currentPage} of ${totalPages} --`, pageWidth / 2, footerY, { align: 'center' });
      }
    };

    addCanvasToPdf(coverAndFirstSectionCanvas, false);
    for (const sectionCanvas of restSectionCanvases) addCanvasToPdf(sectionCanvas, true);
    addCanvasToPdf(marksheetCanvas, true);
    addCanvasToPdf(gradingCanvas, true);

    return pdf.output('blob');

  };

  const getStudentPdfFileName = (student) => {
    const serial = sanitizeNamePart(getSerialFromRegistration(student.registrationNumber));
    const studentName = sanitizeNamePart(student.studentName);
    const grade = sanitizeNamePart(student.grade != null ? String(student.grade) : selectedGrade);
    return `${serial}-${studentName}-${grade}.pdf`;
  };

  const handleDownloadReport = async (student) => {
    if (!student) return;
    try {
      setDownloadingRegNo(String(student.registrationNumber || ''));
      const blob = await createPdfBlobForStudent(student);
      triggerBlobDownload(getStudentPdfFileName(student), blob);
    } catch (err) {
      console.error('Error downloading report PDF:', err);
      setError('Failed to download report PDF.');
    } finally {
      setDownloadingRegNo('');
    }
  };

  const handleDownloadAllReports = async () => {
    if (!selectedGrade || studentsInGrade.length === 0) return;
    if (courseCodesForGrade.length === 0) {
      setError('No courses found for this grade.');
      return;
    }
    try {
      setDownloadingAll(true);
      setError(null);
      const recordsByCourseForZip = await fetchAllRecordsForGrade(courseCodesForGrade);
      const dataOverride = {
        recordsByCourse: recordsByCourseForZip,
        allStudents: students,
        courses,
        gradingSchemeRows: selectedGradingSchemeRows,
        curriculumList,
      };
      const zip = new JSZip();
      for (const student of studentsInGrade) {
        const blob = await createPdfBlobForStudent(student, dataOverride);
        zip.file(getStudentPdfFileName(student), blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const year = new Date().getFullYear();
      const zipName = `AnnualExamination-${year}-${sanitizeNamePart(selectedGrade)}.zip`;
      triggerBlobDownload(zipName, zipBlob);
    } catch (err) {
      console.error('Error downloading all report PDFs:', err);
      setError('Failed to download all reports.');
    } finally {
      setDownloadingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="reports-container">        <div className="reports-loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">        <div className="reports-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="reports-container">      <div className="reports-content">
        <div className="page-local-header-block">
          <h2 className="reports-title">Reports</h2>
          <p className="reports-subtitle">Select a grade and grading scheme to view students and download reports.</p>
        </div>

        <div className="reports-filters">
          <div className="reports-select-wrapper">
            <label htmlFor="reports-grade-select" className="reports-select-label">
              Grade
            </label>
            <select
              id="reports-grade-select"
              className="reports-select"
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
            >
              <option value="">Select a grade</option>
              {gradesFromDb.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </select>
          </div>

          <div className="reports-select-wrapper">
            <label htmlFor="reports-grading-scheme-select" className="reports-select-label">
              Grading scheme (grade mapping)
            </label>
            <select
              id="reports-grading-scheme-select"
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
          <div className="reports-prompt">Please select a grade above to view students.</div>
        )}

        {selectedGrade && gradingSchemes.length === 0 && (
          <div className="reports-prompt reports-prompt-warning">
            No grading scheme found. Define one from the Grading Scheme page so reports use the correct grade mapping.
          </div>
        )}

        {selectedGrade && gradingSchemes.length > 0 && !selectedGradingSchemeId && (
          <div className="reports-prompt">Please select a grading scheme above to view reports.</div>
        )}

        {selectedGrade && selectedGradingSchemeId && courseCodesForGrade.length === 0 && (
          <div className="reports-prompt reports-prompt-warning">
            No saved marks found for Grade {selectedGrade}. Enter marks from the Record page first.
          </div>
        )}

        {selectedGrade && selectedGradingSchemeId && courseCodesForGrade.length > 0 && (
          <>
            {studentsInGrade.length > 0 && topThreeStudents.length > 0 && (
              <div className="reports-top-three-card">
                <div className="reports-top-three-header">
                  <span className="reports-top-three-icon" aria-hidden="true">🏆</span>
                  <h3 className="reports-top-three-title">Top 3 Performers</h3>
                  <span className="reports-top-three-subtitle">Congratulations to our achievers!</span>
                </div>
                <div className="reports-top-three-list">
                  {topThreeStudents.map((item, idx) => {
                    const position = idx + 1;
                    const posClass = position === 1 ? 'first' : position === 2 ? 'second' : 'third';
                    const trophy = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';
                    return (
                      <div key={item.student.registrationNumber} className={`reports-top-three-item reports-top-three-${posClass}`}>
                        <div className="reports-top-three-item-medal" aria-hidden="true">{trophy}</div>
                        <div className="reports-top-three-item-body">
                          <div className="reports-top-three-item-name">{item.student.studentName || '—'}</div>
                          <div className="reports-top-three-item-meta">
                            <span>Reg. No: {item.student.registrationNumber || '—'}</span>
                            <span>Marks: {item.obtained} / {item.totalMax}</span>
                            <span>{item.percentage}%</span>
                            <span className="reports-top-three-item-grade">Grade: {item.grade}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="reports-download-all-wrapper">
              <button
                type="button"
                className="reports-download-all-btn"
                onClick={handleDownloadAllReports}
                disabled={studentsInGrade.length === 0 || downloadingAll}
                title="Download all reports for this grade"
                aria-label="Download all reports for this grade"
              >
                <span className="btn-icon-wrap"><IconDownload />{downloadingAll ? 'Preparing ZIP...' : 'Download All Reports'}</span>
              </button>
              <button
                type="button"
                className="reports-result-sheet-btn"
                onClick={() => navigate('/reports/result-sheet', { state: { selectedGrade, selectedGradingSchemeId } })}
                disabled={studentsInGrade.length === 0}
                title="View result sheet for this grade"
                aria-label="View result sheet for this grade"
              >
                <span className="btn-icon-wrap"><IconList />Result Sheet</span>
              </button>
            </div>
            <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th className="reports-th">Sr. No</th>
                  <th className="reports-th">Registration Number</th>
                  <th className="reports-th">Name</th>
                  <th className="reports-th reports-th-action">Action</th>
                  <th className="reports-th reports-th-report">Report.</th>
                </tr>
              </thead>
              <tbody>
                {studentsInGrade.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="reports-empty-cell">
                      No students in Grade {selectedGrade}.
                    </td>
                  </tr>
                ) : (
                  studentsInGrade.map((student, index) => (
                    <tr key={student.registrationNumber}>
                      <td className="reports-td">{index + 1}</td>
                      <td className="reports-td">{student.registrationNumber}</td>
                      <td className="reports-td">{student.studentName}</td>
                      <td className="reports-td reports-td-action">
                        <button
                          type="button"
                          className="reports-view-btn"
                          onClick={() => handleViewReport(student)}
                          title={`View report for ${student.studentName}`}
                          aria-label={`View report for ${student.studentName}`}
                        >
                          <span className="btn-icon-wrap"><IconView />View</span>
                        </button>
                      </td>
                      <td className="reports-td reports-td-report">
                        <button
                          type="button"
                          className="reports-download-btn"
                          onClick={() => handleDownloadReport(student)}
                          disabled={downloadingAll || downloadingRegNo === String(student.registrationNumber)}
                          title={`Download report for ${student.studentName}`}
                          aria-label={`Download report for ${student.studentName}`}
                        >
                          <span className="btn-icon-wrap"><IconDownload />{downloadingRegNo === String(student.registrationNumber) ? 'Preparing...' : 'Download'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;
