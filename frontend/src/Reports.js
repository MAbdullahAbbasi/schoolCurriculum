import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { createRoot } from 'react-dom/client';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconDownload, IconList, IconView } from './ButtonIcons';
import {
  StudentReportCover,
  StudentReportGradingScheme,
  StudentReportMarksheet,
  StudentReportObjectiveSection,
} from './StudentReportDocument';
import { buildStudentReportData, normalizeGradingSchemeRows } from './reportUtils';
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

// Normalize grade for matching (e.g. K.G-II, KG-2 -> same)
const normalizeGradeForMatch = (grade) => {
  if (grade == null || grade === '') return '';
  let s = String(grade).trim();
  if (s === '') return '';
  s = s.replace(/^(grade|class)\s+/i, '').trim();
  if (s === '') return '';
  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  const compact = lower.replace(/\s/g, '').replace(/k\.g\.?/g, 'kg');
  if (/^kg[- ]?1$|^kg[- ]?i$|^k\.g\.?[- ]?1$|^k\.g\.?[- ]?i$/i.test(lower) || /^kg[-]?1$|^kg[-]?i$/.test(compact)) return 'KG-1';
  if (/^kg[- ]?2$|^kg\s*ii$|^kg[- ]?ii$|^k\.g\.?[- ]?2$|^k\.g\.?[- ]?ii$/i.test(lower) || /^kg[-]?2$|^kg[-]?ii$/.test(compact)) return 'KG-2';
  if (/^kg[- ]?3$|^kg[- ]?iii$|^k\.g\.?[- ]?3$|^k\.g\.?[- ]?iii$/i.test(lower) || /^kg[-]?3$|^kg[-]?iii$/.test(compact)) return 'KG-3';
  return s;
};

const percentageToGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 85) return 'A';
  if (pct >= 80) return 'B+';
  if (pct >= 75) return 'B';
  if (pct >= 70) return 'C+';
  if (pct >= 65) return 'C';
  if (pct >= 60) return 'D+';
  if (pct >= 55) return 'D';
  if (pct >= 50) return 'E';
  return 'F';
};

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
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [latestGradingSchemeRows, setLatestGradingSchemeRows] = useState([]);
  const [curriculumList, setCurriculumList] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('');
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

  const handleViewReport = (student) => {
    navigate(`/reports/student/${encodeURIComponent(student.registrationNumber)}`, { state: { student } });
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

  // Courses that belong to the selected grade (topic grades match)
  const courseCodesForGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const normalized = normalizeGradeForMatch(selectedGrade);
    if (!normalized) return [];
    return (courses || [])
      .filter((course) => {
        const topics = course.topics || [];
        for (const t of topics) {
          if (t.grade != null && normalizeGradeForMatch(t.grade) === normalized) return true;
        }
        return false;
      })
      .map((c) => c.code)
      .filter(Boolean);
  }, [courses, selectedGrade]);

  // Course total marks (from topics or questionPartMarks)
  const getCourseTotalMarks = (course) => {
    if (!course) return 0;
    const qpm = course.questionPartMarks || [];
    if (qpm.length > 0) return qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
    const topics = course.topics || [];
    return topics.reduce((s, t) => s + (Number(t.marks) || 0), 0);
  };

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
      const grade = percentageToGrade(percentage);
      return { student, obtained: Math.round(obtained * 100) / 100, totalMax, percentage, grade };
    });
    rankList.sort((a, b) => {
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      if (b.obtained !== a.obtained) return b.obtained - a.obtained;
      return (a.student.studentName || '').localeCompare(b.student.studentName || '');
    });
    return rankList.slice(0, 3);
  }, [selectedGrade, studentsInGrade, courses, courseCodesForGrade, recordsByCourse]);

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
        setLatestGradingSchemeRows(normalizeGradingSchemeRows(gradingSchemesList[0]?.rows || []));
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
    if (!selectedGrade || courseCodesForGrade.length === 0) {
      setRecordsByCourse({});
      return;
    }
    let cancelled = false;
    const fetchRecords = async () => {
      const byCourse = {};
      await Promise.all(
        courseCodesForGrade.map(async (code) => {
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
  }, [selectedGrade, courseCodesForGrade]);

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

  const createPdfBlobForStudent = async (student) => {
    const reportData = buildStudentReportData({
      student,
      allStudents: students,
      courses,
      recordsByCourse,
      gradingSchemeRows: latestGradingSchemeRows,
      registrationNumber: student.registrationNumber,
      curriculumList,
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

    const coverCanvas = await renderComponentToCanvas(
      <div className="student-report-detail-content student-report-pdf-content">
        <StudentReportCover reportData={reportData} />
      </div>
    );
    const sectionCanvases = await Promise.all(
      reportData.objectiveSections.map((section) =>
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

    const allCanvases = [coverCanvas, ...sectionCanvases, marksheetCanvas, gradingCanvas];
    const totalPages = allCanvases.reduce((sum, c) => sum + getCanvasPageCount(c), 0);
    const watermarkDataUrl = await getWatermarkDataUrl();

    const pdf = new jsPDF('p', 'mm', 'a4');
    let currentPage = 0;

    const addCanvasToPdf = (canvas, addNewPage) => {
      const imgWidth = usableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const imgData = canvas.toDataURL('image/png');
      let heightLeft = imgHeight;
      let position = marginY;

      const addOnePage = (contentY, contentH) => {
        if (addNewPage || currentPage > 0) pdf.addPage();
        currentPage += 1;
        pdf.setPage(currentPage);
        const wmSize = 80;
        pdf.addImage(watermarkDataUrl, 'PNG', (pageWidth - wmSize) / 2, (pageHeight - wmSize) / 2, wmSize, wmSize);
        pdf.addImage(imgData, 'PNG', marginX, contentY, imgWidth, imgHeight);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`-- ${currentPage} of ${totalPages} --`, pageWidth / 2, footerY, { align: 'center' });
      };

      addOnePage(position, imgHeight);
      heightLeft -= usableHeight;

      while (heightLeft > 0) {
        position = marginY + (heightLeft - imgHeight);
        pdf.addPage();
        currentPage += 1;
        pdf.setPage(currentPage);
        pdf.addImage(watermarkDataUrl, 'PNG', (pageWidth - 80) / 2, (pageHeight - 80) / 2, 80, 80);
        pdf.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`-- ${currentPage} of ${totalPages} --`, pageWidth / 2, footerY, { align: 'center' });
        heightLeft -= usableHeight;
      }
    };

    addCanvasToPdf(coverCanvas, false);
    for (const sectionCanvas of sectionCanvases) addCanvasToPdf(sectionCanvas, true);
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
    try {
      setDownloadingAll(true);
      const zip = new JSZip();
      for (const student of studentsInGrade) {
        const blob = await createPdfBlobForStudent(student);
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
        <p className="reports-subtitle">Select a grade to view students and download reports.</p>

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

        {!selectedGrade && (
          <div className="reports-prompt">Please select a grade above to view students.</div>
        )}

        {selectedGrade && (
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
                onClick={() => navigate('/reports/result-sheet', { state: { selectedGrade } })}
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
