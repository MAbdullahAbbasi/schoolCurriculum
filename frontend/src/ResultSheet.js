import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconBack } from './ButtonIcons';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './ResultSheet.css';

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

const getCourseTotalMarks = (course) => {
  if (!course) return 0;
  const qpm = course.questionPartMarks || [];
  if (qpm.length > 0) return qpm.reduce((s, m) => s + (Number(m.marks) || 0), 0);
  const topics = course.topics || [];
  return topics.reduce((s, t) => s + (Number(t.marks) || 0), 0);
};

// Registration number has 4 parts separated by 3 hyphens: year - serialNumber - part3 - part4
const getSerialFromRegistration = (regNo) => {
  if (regNo == null || String(regNo).trim() === '') return '—';
  const parts = String(regNo).trim().split('-');
  return parts.length >= 2 ? parts[1].trim() : '—';
};

// Subject order for result sheet (original – do not change; result sheet is source of truth)
const SUBJECT_ORDER = [
  'urdu', 'english', 'math', 'science', 'social studies', 'computer',
  'tarjuma tul quran', 'tq', 'islamiat', 'nazra', 'art',
];
const getSubjectSortIndex = (subjectName) => {
  if (!subjectName || typeof subjectName !== 'string') return SUBJECT_ORDER.length;
  const n = subjectName.toLowerCase().trim().replace(/\s+/g, ' ');
  if (n.startsWith('urdu')) return 0;
  if (n.startsWith('eng')) return 1;
  if (/\bmath|maths\b/.test(n) || n === 'mathematics') return 2;
  if (n.startsWith('sci') || n === 'science') return 3;
  if (n.includes('social') || n === 's.st' || n === 's.st.') return 4;
  if (n.startsWith('comp') || n === 'computer') return 5;
  if (n.includes('tarjuma') || n.includes('t.q') || n === 'tq') return 6;
  if (n.includes('islamiat') || n.startsWith('isl') || n.startsWith('del')) return 7;
  if (n.startsWith('nazar') || n === 'nazra') return 8;
  if (n.startsWith('art') || n === 'a.a' || n === 'a.a.') return 9;
  return SUBJECT_ORDER.length;
};

const ResultSheet = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedGrade = location.state?.selectedGrade ?? '';

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [recordsByCourse, setRecordsByCourse] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const tableRef = useRef(null);

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

  const coursesForGrade = useMemo(() => {
    return (courses || []).filter((c) => courseCodesForGrade.includes(c.code));
  }, [courses, courseCodesForGrade]);

  const studentsInGrade = useMemo(() => {
    if (!selectedGrade) return [];
    const gradeStr = String(selectedGrade);
    return (students || [])
      .filter((s) => String(s.grade) === gradeStr)
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
            // no record
          }
        })
      );
      if (!cancelled) setRecordsByCourse(byCourse);
    };
    fetchRecords();
    return () => { cancelled = true; };
  }, [selectedGrade, courseCodesForGrade]);

  // Matrix: subject rows, student columns. Each cell has { marks, percentage } for that subject. Rows sorted by SUBJECT_ORDER.
  const { subjectRows, studentTotals, studentPercentages } = useMemo(() => {
    const rows = coursesForGrade.map((course) => {
      const subjectName = (course.subject && String(course.subject).trim()) || course.courseName || course.code || '—';
      const courseTotal = getCourseTotalMarks(course);
      const record = recordsByCourse[course.code];
      const marksPerStudent = studentsInGrade.map((student) => {
        const entry = record?.students?.find((s) => String(s.registrationNumber) === String(student.registrationNumber));
        if (!entry || courseTotal <= 0) return null;
        const pct = Number(entry.overallPercentage);
        if (!Number.isFinite(pct)) return null;
        const marks = Math.round((pct / 100) * courseTotal * 100) / 100;
        const percentage = Math.round(pct * 100) / 100;
        return { marks, percentage };
      });
      return { subjectName, courseTotal, marksPerStudent };
    });
    rows.sort((a, b) => getSubjectSortIndex(a.subjectName) - getSubjectSortIndex(b.subjectName));

    // Total obtained per student (only from subjects they're enrolled in — cell non-null)
    const studentTotals = studentsInGrade.map((_, studentIdx) =>
      rows.reduce((sum, r) => {
        const cell = r.marksPerStudent[studentIdx];
        return sum + (cell ? cell.marks : 0);
      }, 0)
    );
    // Total max per student: only sum course totals for courses where this student has a cell (enrolled).
    // So Bio/Comp choice: Biology students don't include Computer max, and vice versa.
    const studentTotalMaxes = studentsInGrade.map((_, studentIdx) =>
      rows.reduce((sum, r) => {
        const cell = r.marksPerStudent[studentIdx];
        return sum + (cell ? r.courseTotal : 0);
      }, 0)
    );
    const studentPercentages = studentTotals.map((total, i) =>
      studentTotalMaxes[i] > 0 ? Math.round((total / studentTotalMaxes[i]) * 10000) / 100 : 0
    );

    return { subjectRows: rows, studentTotals, studentPercentages };
  }, [coursesForGrade, recordsByCourse, studentsInGrade]);

  const handleBack = () => {
    navigate('/reports', { state: { selectedGrade } });
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

  const handleDownloadPdf = async () => {
    if (!tableRef.current) return;
    setDownloadingPdf(true);
    setError(null);
    let mountNode = null;
    try {
      const gradePart = sanitizeNamePart(selectedGrade);
      const pdfTitle = `ResultSheet-Grade-${gradePart}`;
      const filename = `${pdfTitle}.pdf`;

      // Build a transposed table for PDF:
      // - First column: student names
      // - First row (after header): subjects
      mountNode = document.createElement('div');
      mountNode.style.position = 'fixed';
      mountNode.style.left = '-10000px';
      mountNode.style.top = '0';
      mountNode.style.width = '1100px';
      mountNode.style.background = '#ffffff';
      mountNode.style.zIndex = '-1';
      document.body.appendChild(mountNode);

      const titleEl = document.createElement('div');
      titleEl.textContent = pdfTitle;
      titleEl.style.fontSize = '18px';
      titleEl.style.fontWeight = '900';
      titleEl.style.textAlign = 'center';
      titleEl.style.marginBottom = '12px';
      mountNode.appendChild(titleEl);

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

      studentsInGrade.forEach((student, studentIdx) => {
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
          td.textContent = cell ? `${cell.marks} (${cell.percentage}%)` : '—';
          tr.appendChild(td);
        });

        const tdTotal = document.createElement('td');
        tdTotal.className = 'result-sheet-td';
        tdTotal.style.textAlign = 'center';
        tdTotal.style.fontWeight = '800';
        tdTotal.textContent = String(studentTotals?.[studentIdx] ?? 0);
        tr.appendChild(tdTotal);

        const tdPct = document.createElement('td');
        tdPct.className = 'result-sheet-td';
        tdPct.style.textAlign = 'center';
        tdPct.style.fontWeight = '800';
        tdPct.textContent = `${studentPercentages?.[studentIdx] ?? 0}%`;
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
      if (mountNode && mountNode.parentNode) {
        mountNode.parentNode.removeChild(mountNode);
      }
      setDownloadingPdf(false);
    }
  };

  if (!selectedGrade) {
    return (
      <div className="result-sheet-container">
        <CurriculumHeader />
        <div className="result-sheet-content">
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
      <div className="result-sheet-container">
        <CurriculumHeader />
        <div className="result-sheet-loading">Loading result sheet...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="result-sheet-container">
        <CurriculumHeader />
        <div className="result-sheet-error">{error}</div>
        <button type="button" className="result-sheet-back-btn" onClick={handleBack}>
          <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
        </button>
      </div>
    );
  }

  return (
    <div className="result-sheet-container">
      <CurriculumHeader />
      <div className="result-sheet-content">
        <div className="result-sheet-header">
          <button type="button" className="result-sheet-back-btn" onClick={handleBack}>
            <span className="btn-icon-wrap"><IconBack />Back to Reports</span>
          </button>
          <h2 className="result-sheet-title">Result Sheet — Grade {selectedGrade}</h2>
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
                {studentsInGrade.map((s) => (
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
                    <td key={studentsInGrade[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                      {cell != null ? (
                        <span className="result-sheet-cell-content">
                          <span className="result-sheet-cell-marks">{cell.marks}</span>
                          <span className="result-sheet-cell-pct"> ({cell.percentage}%)</span>
                        </span>
                      ) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="result-sheet-row-total">
                <td className="result-sheet-td result-sheet-td-subject">Total</td>
                {studentTotals.map((total, studentIdx) => (
                  <td key={studentsInGrade[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                    {total}
                  </td>
                ))}
              </tr>
              <tr className="result-sheet-row-percentage">
                <td className="result-sheet-td result-sheet-td-subject">Percentage</td>
                {studentPercentages.map((pct, studentIdx) => (
                  <td key={studentsInGrade[studentIdx]?.registrationNumber} className="result-sheet-td result-sheet-td-marks">
                    {pct}%
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
