import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconBack, IconCreate } from './ButtonIcons';
import './CreateCourseMarks.css';

const slotKey = (q, part) => (part === 0 ? `q${q}` : `q${q}-p${part}`);

// Normalize grade for matching: any KG-2 variant -> "KG-2" (handles "KG II", "K.G-II", "KG-2", "Grade KG II", etc.)
const normalizeGradeForMatch = (grade) => {
  if (grade == null || grade === '') return '';
  let s = String(grade).trim();
  if (s === '') return '';
  s = s.replace(/^(grade|class)\s+/i, '').trim();
  if (s === '') return '';
  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  const compact = lower.replace(/\s/g, '').replace(/k\.g\.?/g, 'kg'); // "k.g-ii" -> "kg-ii", "k.g.2" -> "kg2"
  if (/^kg[- ]?1$|^kg[- ]?i$|^k\.g\.?[- ]?1$|^k\.g\.?[- ]?i$/i.test(lower) || /^kg[-]?1$|^kg[-]?i$/.test(compact)) return 'KG-1';
  if (/^kg[- ]?2$|^kg\s*ii$|^kg[- ]?ii$|^k\.g\.?[- ]?2$|^k\.g\.?[- ]?ii$/i.test(lower) || /^kg[-]?2$|^kg[-]?ii$/.test(compact)) return 'KG-2';
  if (/^kg[- ]?3$|^kg[- ]?iii$|^k\.g\.?[- ]?3$|^k\.g\.?[- ]?iii$/i.test(lower) || /^kg[-]?3$|^kg[-]?iii$/.test(compact)) return 'KG-3';
  return s;
};

const CreateCourseMarks = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    coursePayload = null,
    totalQuestions: totalQuestionsFromState = 0,
    questionParts: questionPartsFromState = [],
    resolvedTopics = [],
  } = location.state || {};

  const [marksBySlot, setMarksBySlot] = useState({});
  const [objectiveSelection, setObjectiveSelection] = useState({});
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  const totalMarks = useMemo(() => Number(coursePayload?.totalMarks) || 0, [coursePayload]);
  const questionParts = useMemo(
    () => (Array.isArray(questionPartsFromState) && questionPartsFromState.length > 0
      ? questionPartsFromState
      : Array.from({ length: totalQuestionsFromState || 0 }, (_, i) => ({
          questionIndex: i + 1,
          numParts: 0,
          compulsoryParts: 0,
        }))),
    [questionPartsFromState, totalQuestionsFromState]
  );

  const slots = useMemo(() => {
    const list = [];
    questionParts.forEach((p) => {
      const q = p.questionIndex;
      const n = Number(p.numParts) || 0;
      const compulsory = Number(p.compulsoryParts) || 0;
      if (n <= 0) {
        list.push({ questionIndex: q, partIndex: 0, label: `Q${q}`, partLabel: null, key: slotKey(q, 0), isCompulsory: true });
      } else {
        for (let part = 1; part <= n; part++) {
          list.push({
            questionIndex: q,
            partIndex: part,
            label: `Q${q}`,
            partLabel: `Part ${part}`,
            key: slotKey(q, part),
            isCompulsory: part <= compulsory,
          });
        }
      }
    });
    return list;
  }, [questionParts]);

  const sumAllMarks = useMemo(
    () => slots.reduce((s, sl) => s + (Number(marksBySlot[sl.key]) || 0), 0),
    [slots, marksBySlot]
  );
  const sumCompulsoryMarks = useMemo(
    () => slots.filter((sl) => sl.isCompulsory).reduce((s, sl) => s + (Number(marksBySlot[sl.key]) || 0), 0),
    [slots, marksBySlot]
  );
  const totalValid = totalMarks > 0 && Math.abs(sumCompulsoryMarks - totalMarks) < 0.01;
  const allObjectivesSelected = useMemo(
    () => resolvedTopics.length > 0 && slots.every((sl) => objectiveSelection[sl.key]),
    [slots, objectiveSelection, resolvedTopics.length]
  );

  const handleMarksChange = (q, part, value) => {
    setMarksBySlot((prev) => ({ ...prev, [slotKey(q, part)]: value }));
    setCreateError(null);
  };

  const handleObjectiveSelect = (slotKeyVal, topicKey) => {
    setObjectiveSelection((prev) => ({ ...prev, [slotKeyVal]: topicKey || '' }));
    setCreateError(null);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleCreateCourse = async () => {
    if (!coursePayload) {
      setCreateError('Missing course data. Please go back and complete the course form.');
      return;
    }
    if (!totalValid) {
      setCreateError(`Total (compulsory parts only) must equal ${totalMarks}. Current compulsory sum: ${sumCompulsoryMarks}.`);
      return;
    }
    if (resolvedTopics.length === 0) {
      setCreateError('No objectives available. Please start from the curriculum and select objectives for this course.');
      return;
    }
    if (!allObjectivesSelected) {
      setCreateError('Please select an objective for every question/part in the Objectives column.');
      return;
    }

    const topicMarks = {};
    resolvedTopics.forEach((t) => { topicMarks[t.topicKey] = 0; });
    slots.forEach((sl) => {
      const selectedKey = objectiveSelection[sl.key];
      const m = Number(marksBySlot[sl.key]) || 0;
      if (selectedKey) topicMarks[selectedKey] = (topicMarks[selectedKey] || 0) + m;
    });

    const topics = resolvedTopics.map((t) => ({
      courseCode: t.courseCode,
      topicName: t.topicName,
      description: t.description ?? '',
      marks: topicMarks[t.topicKey] ?? 0,
      grade: t.grade,
    }));

    const questionTopicIndices = {};
    slots.forEach((sl) => {
      const selectedKey = objectiveSelection[sl.key];
      const idx = resolvedTopics.findIndex((t) => t.topicKey === selectedKey);
      if (idx >= 0) {
        const q = sl.questionIndex;
        if (!questionTopicIndices[q]) questionTopicIndices[q] = new Set();
        questionTopicIndices[q].add(idx);
      }
    });
    const questions = Object.keys(questionTopicIndices).map((q) => ({
      questionIndex: Number(q),
      topicIndices: Array.from(questionTopicIndices[q]),
    }));

    const questionPartMarks = slots.map((sl) => ({
      questionIndex: sl.questionIndex,
      partIndex: sl.partIndex,
      marks: Number(marksBySlot[sl.key]) || 0,
    }));

    const payload = {
      ...coursePayload,
      topics,
      totalQuestions: totalQuestionsFromState,
      questions,
      ...(coursePayload.compulsoryQuestions != null && { compulsoryQuestions: coursePayload.compulsoryQuestions }),
      ...(questionPartsFromState?.length > 0 && { questionParts: questionPartsFromState }),
      ...(questionPartMarks.length > 0 && { questionPartMarks }),
    };

    try {
      setCreating(true);
      setCreateError(null);
      const response = await axios.post(`${API_URL}/api/courses`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.data.success) {
        let enrolledCount = 0;
        try {
          const studentsRes = await axios.get(`${API_URL}/api/students-data`);
          const raw = studentsRes.data;
          const studentsList = Array.isArray(raw) ? raw : (raw?.data && Array.isArray(raw.data) ? raw.data : []);
          const courseGrades = new Set();
          resolvedTopics.forEach((t) => {
            if (t.grade != null && t.grade !== '') {
              courseGrades.add(normalizeGradeForMatch(t.grade));
            }
          });
          const sub = (coursePayload?.subject && String(coursePayload.subject).trim()) || '';
          const courseSubjectForGrade8 = courseGrades.has('8') && (sub === 'Biology' || sub === 'Computer') ? sub : null;
          if (courseGrades.size > 0) {
            enrolledCount = studentsList.filter((s) => {
              const normalized = normalizeGradeForMatch(s.grade);
              if (normalized === '' || !courseGrades.has(normalized)) return false;
              if (courseSubjectForGrade8 && normalized === '8') {
                const studentSub = (s.subject && String(s.subject).trim()) || '';
                return studentSub === courseSubjectForGrade8;
              }
              return true;
            }).length;
          } else {
            enrolledCount = studentsList.length;
          }
        } catch (_) {
          // ignore; we still show success
        }
        const enrolledMsg =
          enrolledCount === 0
            ? 'Course created successfully. No students are currently enrolled in this course (no students in the selected grade(s)).'
            : `Course created successfully. ${enrolledCount} student${enrolledCount === 1 ? '' : 's'} ${enrolledCount === 1 ? 'is' : 'are'} enrolled in this course.`;
        alert(enrolledMsg);
        navigate('/', { replace: true });
      } else {
        setCreateError(response.data.message || response.data.error || 'Failed to create course.');
      }
    } catch (err) {
      setCreateError(
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create course.'
      );
    } finally {
      setCreating(false);
    }
  };

  if (!coursePayload || !totalQuestionsFromState) {
    return (
      <div className="create-course-marks-container">
        <CurriculumHeader />
        <div className="create-course-marks-content">
          <p className="create-course-marks-missing">Missing course data. Please start from the Create Course page.</p>
          <button type="button" className="create-course-marks-back-btn" onClick={() => navigate('/create-course')}>
            <span className="btn-icon-wrap"><IconBack />Back to Create Course</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-course-marks-container">
      <CurriculumHeader />
      <div className="create-course-marks-content">
        <h2 className="create-course-marks-title">Enter marks per question</h2>
        <p className="create-course-marks-hint">
          Enter marks for each question/part and select one objective per row. Only <strong>compulsory</strong> parts count toward the total; optional parts are still saved and assigned to their objectives. Total (compulsory only) must equal <strong>{totalMarks}</strong>.
        </p>

        <div className="create-course-marks-table-wrapper">
          <table className="create-course-marks-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Part</th>
                <th>Marks</th>
                <th className="create-course-marks-th-objectives">Objective</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((sl) => (
                <tr key={sl.key}>
                  <td className="marks-q-cell">{sl.label}</td>
                  <td className="marks-part-cell">{sl.partLabel != null ? sl.partLabel : '—'}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="marks-slot-input"
                      value={marksBySlot[sl.key] ?? ''}
                      onChange={(e) => handleMarksChange(sl.questionIndex, sl.partIndex, e.target.value)}
                      placeholder="0"
                      aria-label={`Marks for ${sl.label}${sl.partLabel ? ` ${sl.partLabel}` : ''}`}
                    />
                  </td>
                  <td className="create-course-marks-td-objectives">
                    <select
                      className="create-course-marks-objective-select"
                      value={objectiveSelection[sl.key] ?? ''}
                      onChange={(e) => handleObjectiveSelect(sl.key, e.target.value || null)}
                      aria-label={`Objective for ${sl.label}${sl.partLabel ? ` ${sl.partLabel}` : ''}`}
                    >
                      <option value="">Select objective</option>
                      {resolvedTopics.map((t) => (
                        <option key={t.topicKey} value={t.topicKey}>
                          {t.topicName || t.courseCode || t.topicKey}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={`create-course-marks-sum ${!totalValid && sumCompulsoryMarks > 0 ? 'create-course-marks-sum-error' : ''}`}>
          Total (compulsory only): <strong>{sumCompulsoryMarks}</strong> / {totalMarks}
          {sumAllMarks !== sumCompulsoryMarks && (
            <span className="create-course-marks-sum-optional"> (all parts: {sumAllMarks})</span>
          )}
        </p>
        {!allObjectivesSelected && resolvedTopics.length > 0 && slots.length > 0 && (
          <p className="create-course-marks-objectives-hint">Select an objective for every row to create the course.</p>
        )}
        {createError && (
          <div className="create-course-marks-error" role="alert">
            {createError}
          </div>
        )}
        <div className="create-course-marks-actions">
          <button type="button" className="create-course-marks-back-btn" onClick={handleBack} disabled={creating}>
            <span className="btn-icon-wrap"><IconBack />Back</span>
          </button>
          <button
            type="button"
            className="create-course-marks-next-btn"
            onClick={handleCreateCourse}
            disabled={!totalValid || !allObjectivesSelected || creating}
          >
            <span className="btn-icon-wrap"><IconCreate />{creating ? 'Creating...' : 'Create course'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCourseMarks;
