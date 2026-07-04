import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import { IconBack } from './ButtonIcons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ReportSchoolHeader from './ReportSchoolHeader';
import {
  getCourseTotalMarks,
  filterCoursesForReport,
  formatSessionLabelFromGradingScheme,
  formatGradingSchemeNameOnly,
  formatPercentageDisplay,
  roundPercentage,
  roundMarks,
  formatMarksDisplay,
  getStudentSubjectMarks,
  deduplicateCoursesBySubject,
  getSubjectSortIndex,
  studentQualifiesForResultSheet,
} from './reportUtils';
import { studentMatchesGrade } from './studentDataUtils';
import './ResultSheet.css';
import './pdfExport.css';

// Registration number has 4 parts separated by 3 hyphens: year - serialNumber - part3 - part4
const getSerialFromRegistration = (regNo) => {
  if (regNo == null || String(regNo).trim() === '') return '—';
  const parts = String(regNo).trim().split('-');
  return parts.length >= 2 ? parts[1].trim() : '—';
};

const ResultSheet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedGrade = location.state?.selectedGrade ?? '';
  const selectedGradingScheme = location.state?.selectedGradingScheme ?? null;

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const tableRef = useRef(null);

  const sessionCourseCodesForGrade = useMemo(() => {
    if (!selectedGrade) return [];
    return filterCoursesForReport(courses, {
      grade: selectedGrade,
      gradingScheme: selectedGradingScheme,
    })
      .map((c) => c.code)
      .filter(Boolean);
  }, [courses, selectedGrade, selectedGradingScheme]);

  // Include all session-matched courses; drop duplicate subjects (e.g. two Maths courses).
  const coursesForSession = useMemo(() => {
    const matched = (courses || []).filter((c) => sessionCourseCodesForGrade.includes(c.code));
    return deduplicateCoursesBySubject(matched, recordsByCourse);
  }, [courses, sessionCourseCodesForGrade, recordsByCourse]);

  const studentsInGrade = useMemo(() => {
    if (!selectedGrade) return [];
    return (students || [])
      .filter((s) => studentMatchesGrade(s, selectedGrade))
      .sort((a, b) => {
        const nameA = (a.studentName || '').toLowerCase();
        const nameB = (b.studentName || '').toLowerCase();
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return (a.registrationNumber || '').localeCompare(b.registrationNumber || '');
      });
  }, [students, selectedGrade]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [studentsRes, coursesRes] = await Promise.all([
          axios.get(`${API_URL}/api/students-data`),
          axios.get(`${API_URL}/api/courses`),
        ]);
        setStudents(Array.isArray(studentsRes.data) ? studentsRes.data : (studentsRes.data?.data || []));
        setCourses(coursesRes.data?.success ? (coursesRes.data.data || []) : []);
      } catch (err) {
        console.error('Error fetching data:', err);
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

  // Matrix: subject rows, student columns. Exclude students with 0% in all subjects.
  const { subjectRows, studentTotals, studentPercentages, studentsForSheet } = useMemo(() => {
    const rows = coursesForSession.map((course) => {
      const subjectName = (course.subject && String(course.subject).trim()) || course.courseName || course.code || '—';
      const courseTotal = getCourseTotalMarks(course);
      const record = recordsByCourse[course.code];
      const marksPerStudent = studentsInGrade.map((student) => {
        const entry = record?.students?.find((s) => String(s.registrationNumber) === String(student.registrationNumber));
        return getStudentSubjectMarks(entry, courseTotal);
      });
      return { subjectName, courseTotal, marksPerStudent };
    });
    rows.sort((a, b) => getSubjectSortIndex(a.subjectName) - getSubjectSortIndex(b.subjectName));

    const sheetMaxTotal = roundMarks(rows.reduce((sum, r) => sum + r.courseTotal, 0));

    const allStudentTotals = studentsInGrade.map((_, studentIdx) =>
      roundMarks(
        rows.reduce((sum, r) => {
          const cell = r.marksPerStudent[studentIdx];
          return sum + (cell != null ? cell.marks : 0);
        }, 0)
      )
    );
    const allStudentPercentages = allStudentTotals.map((total) =>
      sheetMaxTotal > 0 ? roundPercentage((total / sheetMaxTotal) * 100) ?? 0 : 0
    );

    const activeIndices = studentsInGrade
      .map((_, i) => i)
      .filter((i) => studentQualifiesForResultSheet(i, rows));

    return {
      subjectRows: rows.map((row) => ({
        ...row,
        marksPerStudent: activeIndices.map((i) => row.marksPerStudent[i]),
      })),
      studentTotals: activeIndices.map((i) => allStudentTotals[i]),
      studentPercentages: activeIndices.map((i) => allStudentPercentages[i]),
      studentsForSheet: activeIndices.map((i) => studentsInGrade[i]),
    };
  }, [coursesForSession, recordsByCourse, studentsInGrade]);

  const handleBack = () => {
    navigate('/reports', {
      state: {
        selectedGrade,
        selectedGradingSchemeId: location.state?.selectedGradingSchemeId || '',
      },
    });
  };

  const triggerBlobDownload = (filename, blob) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
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

  const handleDownloadPdf = async () => {
    if (!tableRef.current) return;
    setDownloadingPdf(true);
    setError(null);
    let mountNode = null;
    let headerRoot = null;
    try {
      const gradePart = sanitizeNamePart(selectedGrade);
      const pdfTitle = `ResultSheet-Grade-${gradePart}`;
      const filename = `${pdfTitle}.pdf`;
      const sessionName = formatGradingSchemeNameOnly(selectedGradingScheme);

      mountNode = document.createElement('div');
      mountNode.className = 'pdf-export-root';
      mountNode.style.position = 'fixed';
      mountNode.style.left = '-10000px';
      mountNode.style.top = '0';
      mountNode.style.width = '1100px';
      mountNode.style.background = '#ffffff';
      mountNode.style.zIndex = '-1';
      document.body.appendChild(mountNode);

      const headerMount = document.createElement('div');
      headerMount.className = 'result-sheet-pdf-header-wrap';
      mountNode.appendChild(headerMount);
      headerRoot = createRoot(headerMount);
      headerRoot.render(<ReportSchoolHeader sessionName={sessionName} />);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await waitForImages(mountNode);

      const wrapper = document.createElement('div');
      wrapper.className = 'result-sheet-table-wrapper';
      mountNode.appendChild(wrapper);

      const pdfTable = document.createElement('table');
      pdfTable.className = 'result-sheet-table';

      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');

      const thStudent = document.createElement('th');
      thStudent.className = 'result-sheet-th';
      thStudent.textContent = 'Student';
      headerRow.appendChild(thStudent);

      // Subjects across the header row.
      for (const row of subjectRows) {
        const th = document.createElement('th');
        th.className = 'result-sheet-th';
        th.style.textAlign = 'center';
        th.style.fontWeight = '800';
        th.textContent = row.subjectName;
        headerRow.appendChild(th);
      }

      // Add Total + Percentage columns.
      const thTotal = document.createElement('th');
      thTotal.className = 'result-sheet-th';
      thTotal.style.textAlign = 'center';
      thTotal.textContent = 'Total';
      headerRow.appendChild(thTotal);

      const thPct = document.createElement('th');
      thPct.className = 'result-sheet-th';
      thPct.style.textAlign = 'center';
      thPct.textContent = 'Percentage';
      headerRow.appendChild(thPct);

      thead.appendChild(headerRow);
      pdfTable.appendChild(thead);

      const tbody = document.createElement('tbody');

      studentsForSheet.forEach((student, studentIdx) => {
        const tr = document.createElement('tr');

        const tdStudent = document.createElement('td');
        tdStudent.className = 'result-sheet-td';
        tdStudent.textContent = student.studentName || student.registrationNumber || '—';
        tdStudent.style.fontWeight = '800';
        tr.appendChild(tdStudent);

        subjectRows.forEach((subjectRow) => {
          const cell = subjectRow.marksPerStudent?.[studentIdx] ?? null;
          const td = document.createElement('td');
          td.className = 'result-sheet-td';
          td.style.textAlign = 'center';
          td.textContent = cell != null
            ? `${formatMarksDisplay(cell.marks)} (${formatPercentageDisplay(cell.percentage)})`
            : '—';
          tr.appendChild(td);
        });

        const tdTotal = document.createElement('td');
        tdTotal.className = 'result-sheet-td';
        tdTotal.style.textAlign = 'center';
        tdTotal.style.fontWeight = '800';
        tdTotal.textContent = formatMarksDisplay(studentTotals?.[studentIdx] ?? 0);
        tr.appendChild(tdTotal);

        const tdPct = document.createElement('td');
        tdPct.className = 'result-sheet-td';
        tdPct.style.textAlign = 'center';
        tdPct.style.fontWeight = '800';
        tdPct.textContent = formatPercentageDisplay(studentPercentages?.[studentIdx] ?? 0);
        tr.appendChild(tdPct);

        tbody.appendChild(tr);
      });

      pdfTable.appendChild(tbody);
      wrapper.appendChild(pdfTable);

      // Give browser a tick to apply layout before snapshot.
      await new Promise((resolve) => setTimeout(resolve, 50));

      const canvas = await html2canvas(mountNode, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 10;
      const marginY = 10;
      const footerY = pageHeight - 12;
      const usableWidth = pageWidth - marginX * 2;
      const usableHeight = pageHeight - marginY * 2 - 14;

      const imgWidth = usableWidth;
      const imgHeightMm = (canvas.height * imgWidth) / canvas.width;
      const totalPages = Math.ceil(imgHeightMm / usableHeight) || 1;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let currentPage = 0;

      for (let p = 0; p < totalPages; p++) {
        const sliceTopMm = p * usableHeight;
        const sliceBottomMm = Math.min(sliceTopMm + usableHeight, imgHeightMm);
        const sliceHeightMm = sliceBottomMm - sliceTopMm;
        const sliceTopPx = (sliceTopMm / imgHeightMm) * canvas.height;
        const sliceHeightPx = (sliceHeightMm / imgHeightMm) * canvas.height;

        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.round(sliceHeightPx);
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(
          canvas,
          0,
          sliceTopPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx
        );

        const sliceData = sliceCanvas.toDataURL('image/png');
        if (p > 0) pdf.addPage();
        currentPage += 1;
        pdf.setPage(currentPage);
        pdf.addImage(sliceData, 'PNG', marginX, marginY, imgWidth, sliceHeightMm);
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`-- ${currentPage} of ${totalPages} --`, pageWidth / 2, footerY, { align: 'center' });
      }

      const blob = pdf.output('blob');
      triggerBlobDownload(filename, blob);
    } catch (err) {
      console.error('Error downloading result sheet PDF:', err);
      setError('Failed to download PDF.');
    } finally {
      if (headerRoot) {
        headerRoot.unmount();
      }
      if (mountNode && mountNode.parentNode) {
        mountNode.parentNode.removeChild(mountNode);
      }
      setDownloadingPdf(false);
    }
  };

  if (!selectedGrade) {
    return (
      <div className="result-sheet-container">        <div className="result-sheet-content">
          <p className="result-sheet-no-grade">No grade selected. Please go to Reports and select a grade first.</p>
          <button type="button" className="result-sheet-back-btn" onClick={() => navigate('/reports')}>
            <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="result-sheet-container">        <div className="result-sheet-loading">Loading result sheet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-sheet-container">        <div className="result-sheet-error">{error}</div>
        <button type="button" className="result-sheet-back-btn" onClick={handleBack}>
          <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
        </button>
      </div>
    );
  }

  return (
    <div className="result-sheet-container">      <div className="result-sheet-content">
        <div className="result-sheet-header">
          <button type="button" className="result-sheet-back-btn" onClick={handleBack}>
            <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
          </button>
          <h2 className="result-sheet-title page-local-header">
            Result Sheet — Grade {selectedGrade}
            {selectedGradingScheme ? ` (${formatSessionLabelFromGradingScheme(selectedGradingScheme)})` : ''}
          </h2>
        </div>

        <div className="result-sheet-table-actions">
          <button
            type="button"
            className="result-sheet-download-btn"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
          >
            {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </div>

        <div className="result-sheet-table-wrapper">
          <table ref={tableRef} className="result-sheet-table">
            <thead>
              <tr>
                <th className="result-sheet-th result-sheet-th-subject">Subject</th>
                {studentsForSheet.map((s) => (
                  <th key={s.registrationNumber} className="result-sheet-th result-sheet-th-student">
                    <span className="result-sheet-student-name">{s.studentName || s.registrationNumber || '—'}</span>
                    <span className="result-sheet-student-serial">{getSerialFromRegistration(s.registrationNumber)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subjectRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="result-sheet-td result-sheet-td-subject">{row.subjectName}</td>
                  {row.marksPerStudent.map((cell, studentIdx) => (
                    <td key={studentsForSheet[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                      {cell != null ? (
                        <span className="result-sheet-cell-content">
                          <span className="result-sheet-cell-marks">{formatMarksDisplay(cell.marks)}</span>
                          <span className="result-sheet-cell-pct"> ({formatPercentageDisplay(cell.percentage)})</span>
                        </span>
                      ) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="result-sheet-row-total">
                <td className="result-sheet-td result-sheet-td-subject">Total</td>
                {studentTotals.map((total, studentIdx) => (
                  <td key={studentsForSheet[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                    {formatMarksDisplay(total)}
                  </td>
                ))}
              </tr>
              <tr className="result-sheet-row-percentage">
                <td className="result-sheet-td result-sheet-td-subject">Percentage</td>
                {studentPercentages.map((pct, studentIdx) => (
                  <td key={studentsForSheet[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                    {formatPercentageDisplay(pct)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultSheet;
