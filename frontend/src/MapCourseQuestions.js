import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './MapCourseQuestions.css';

const slotKey = (q, part) => (part === 0 ? `q${q}` : `q${q}-p${part}`);

const MapCourseQuestions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    coursePayload = null,
    totalQuestions: totalQuestionsFromState = 0,
    questionParts: questionPartsFromState = [],
    questionPartMarks: questionPartMarksFromState = [],
    resolvedTopics = [],
  } = location.state || {};

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [selectedPart, setSelectedPart] = useState(null);
  const [mappingBySlot, setMappingBySlot] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const totalQuestions = totalQuestionsFromState || 0;
  const questionParts = useMemo(
    () =>
      Array.isArray(questionPartsFromState) && questionPartsFromState.length > 0
        ? questionPartsFromState
        : Array.from({ length: totalQuestions }, (_, i) => ({
            questionIndex: i + 1,
            numParts: 0,
            compulsoryParts: 0,
          })),
    [questionPartsFromState, totalQuestions]
  );

  const marksBySlot = useMemo(() => {
    const map = {};
    (questionPartMarksFromState || []).forEach(({ questionIndex, partIndex, marks }) => {
      map[slotKey(questionIndex, partIndex)] = Number(marks) || 0;
    });
    return map;
  }, [questionPartMarksFromState]);

  const slots = useMemo(() => {
    const list = [];
    questionParts.forEach((p) => {
      const q = p.questionIndex;
      const n = Number(p.numParts) || 0;
      if (n <= 0) {
        list.push({ questionIndex: q, partIndex: 0, label: `Q${q}`, partLabel: null, slotKey: slotKey(q, 0) });
      } else {
        for (let part = 1; part <= n; part++) {
          list.push({
            questionIndex: q,
            partIndex: part,
            label: `Q${q}`,
            partLabel: `Part ${part}`,
            slotKey: slotKey(q, part),
          });
        }
      }
    });
    return list;
  }, [questionParts]);

  const questionSlots = useMemo(() => {
    const byQ = {};
    slots.forEach((s) => {
      if (!byQ[s.questionIndex]) byQ[s.questionIndex] = [];
      byQ[s.questionIndex].push(s);
    });
    return byQ;
  }, [slots]);

  const activeSlotKey = useMemo(() => {
    if (selectedQuestion == null) return null;
    const parts = questionSlots[selectedQuestion];
    if (!parts || parts.length === 0) return null;
    if (parts.length === 1) return parts[0].slotKey;
    if (selectedPart != null) {
      const slot = parts.find((s) => s.partIndex === selectedPart);
      return slot ? slot.slotKey : null;
    }
    return null;
  }, [selectedQuestion, selectedPart, questionSlots]);

  const activeSlot = useMemo(
    () => (activeSlotKey ? slots.find((s) => s.slotKey === activeSlotKey) : null),
    [activeSlotKey, slots]
  );
  const expectedMarks = activeSlotKey ? (marksBySlot[activeSlotKey] ?? 0) : 0;

  const slotSumMarks = (key) => {
    const state = mappingBySlot[key];
    if (!state?.marks) return 0;
    return Object.values(state.marks).reduce((s, m) => s + (Number(m) || 0), 0);
  };

  const isSlotDone = (key) => {
    const state = mappingBySlot[key];
    if (!state?.selected?.size) return false;
    const exp = marksBySlot[key] ?? 0;
    return Math.abs(slotSumMarks(key) - exp) < 0.01;
  };

  const isQuestionDone = (q) => {
    const parts = questionSlots[q];
    if (!parts) return false;
    return parts.every((s) => isSlotDone(s.slotKey));
  };

  const toggleObjectiveForSlot = (topicKey) => {
    if (!activeSlotKey) return;
    setMappingBySlot((prev) => {
      const next = { ...prev };
      const slot = next[activeSlotKey] || { selected: [], marks: {} };
      const selected = new Set(slot.selected || []);
      const marks = { ...(slot.marks || {}) };
      if (selected.has(topicKey)) {
        selected.delete(topicKey);
        delete marks[topicKey];
      } else {
        selected.add(topicKey);
        marks[topicKey] = '';
      }
      next[activeSlotKey] = { selected: Array.from(selected), marks };
      return next;
    });
    setCreateError(null);
  };

  const setSlotObjectiveMarks = (topicKey, value) => {
    if (!activeSlotKey) return;
    setMappingBySlot((prev) => {
      const next = { ...prev };
      const slot = next[activeSlotKey] || { selected: [], marks: {} };
      const marks = { ...(slot.marks || {}) };
      marks[topicKey] = value;
      next[activeSlotKey] = { ...slot, marks };
      return next;
    });
    setCreateError(null);
  };

  const isObjectiveSelectedForActiveSlot = (topicKey) => {
    if (!activeSlotKey) return false;
    const state = mappingBySlot[activeSlotKey];
    return state?.selected?.includes(topicKey) ?? false;
  };

  const getObjectiveMarksForActiveSlot = (topicKey) => {
    if (!activeSlotKey) return '';
    const state = mappingBySlot[activeSlotKey];
    const v = state?.marks?.[topicKey];
    return v === undefined || v === null ? '' : String(v);
  };

  const allSlotsDone = useMemo(() => {
    if (slots.length === 0) return false;
    return slots.every((s) => {
      const state = mappingBySlot[s.slotKey];
      if (!state?.selected?.length) return false;
      const exp = marksBySlot[s.slotKey] ?? 0;
      const sum = (state.marks && Object.values(state.marks).reduce((a, m) => a + (Number(m) || 0), 0)) || 0;
      return Math.abs(sum - exp) < 0.01;
    });
  }, [slots, mappingBySlot, marksBySlot]);

  const buildPayload = () => {
    const topicMarks = {};
    const questionTopicIndices = {};
    slots.forEach((s) => {
      const state = mappingBySlot[s.slotKey];
      if (!state?.selected?.length) return;
      const q = s.questionIndex;
      if (!questionTopicIndices[q]) questionTopicIndices[q] = new Set();
      state.selected.forEach((topicKey) => {
        const idx = resolvedTopics.findIndex((t) => t.topicKey === topicKey);
        if (idx >= 0) {
          questionTopicIndices[q].add(idx);
          const m = Number(state.marks?.[topicKey]) || 0;
          topicMarks[topicKey] = (topicMarks[topicKey] || 0) + m;
        }
      });
    });

    const topics = resolvedTopics.map((t) => ({
      courseCode: t.courseCode,
      topicName: t.topicName,
      marks: topicMarks[t.topicKey] ?? 0,
      grade: t.grade,
    }));

    const questions = Object.keys(questionTopicIndices).map((q) => ({
      questionIndex: Number(q),
      topicIndices: Array.from(questionTopicIndices[q]),
    }));

    return { ...coursePayload, topics, totalQuestions, questions };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    if (!coursePayload) {
      setCreateError('Missing course data. Please go back and complete the course form.');
      return;
    }
    if (!allSlotsDone) {
      setCreateError('Complete mapping for every question (and part). Each slot must have at least one objective and marks sum equal to the slot marks.');
      return;
    }

    const payload = buildPayload();
    try {
      setSubmitting(true);
      const response = await axios.post(`${API_URL}/api/courses`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.data.success) {
        navigate('/', { replace: true });
      } else {
        setCreateError(response.data.message || response.data.error || 'Failed to create course.');
      }
    } catch (err) {
      setCreateError(
        err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create course.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (!coursePayload || totalQuestions < 1 || resolvedTopics.length === 0) {
    return (
      <div className="map-questions-container">
        <CurriculumHeader />
        <div className="map-questions-content">
          <p className="map-questions-missing">
            Missing course data or objectives. Please start from the curriculum and create course again.
          </p>
          <button type="button" className="map-questions-back-btn" onClick={() => navigate('/')}>
            Back to Curriculum
          </button>
        </div>
      </div>
    );
  }

  const currentParts = selectedQuestion != null ? questionSlots[selectedQuestion] || [] : [];
  const showPartButtons = currentParts.length > 1;

  return (
    <div className="map-questions-container">
      <CurriculumHeader />
      <div className="map-questions-content">
        <h2 className="map-questions-title">Map questions to objectives</h2>
        <p className="map-questions-subtitle">
          Click a question (Q1–Q{totalQuestions}). If it has parts, choose a part. Then select objectives and enter marks for that question or part.
        </p>

        <div className="map-questions-buttons">
          {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((q) => (
            <button
              key={q}
              type="button"
              className={`map-q-btn ${selectedQuestion === q ? 'map-q-btn-active' : ''} ${isQuestionDone(q) ? 'map-q-btn-done' : ''}`}
              onClick={() => {
                setSelectedQuestion(q);
                const parts = questionSlots[q] || [];
                setSelectedPart(parts.length === 1 ? parts[0].partIndex : null);
              }}
            >
              Q{q}
            </button>
          ))}
        </div>

        {showPartButtons && selectedQuestion != null && (
          <div className="map-parts-buttons">
            {currentParts.map((s) => (
              <button
                key={s.slotKey}
                type="button"
                className={`map-part-btn ${selectedPart === s.partIndex ? 'map-part-btn-active' : ''} ${isSlotDone(s.slotKey) ? 'map-part-btn-done' : ''}`}
                onClick={() => setSelectedPart(s.partIndex)}
              >
                {s.partLabel}
              </button>
            ))}
          </div>
        )}

        <div className="map-questions-table-section">
          {activeSlot == null ? (
            <p className="map-questions-prompt">
              {selectedQuestion == null
                ? 'Select a question above.'
                : showPartButtons
                ? 'Select a part above to assign objectives.'
                : 'Select a question to assign objectives.'}
            </p>
          ) : (
            <>
              <h3 className="map-questions-table-heading">
                Objectives for {activeSlot.label}
                {activeSlot.partLabel ? ` – ${activeSlot.partLabel}` : ''} (marks: {expectedMarks})
              </h3>
              <div className="map-questions-table-wrapper">
                <table className="map-questions-table">
                  <thead>
                    <tr>
                      <th className="map-questions-th map-questions-th-check">Select</th>
                      <th className="map-questions-th">Grade</th>
                      <th className="map-questions-th">Code</th>
                      <th className="map-questions-th">Title</th>
                      <th className="map-questions-th">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedTopics.map((t) => {
                      const selected = isObjectiveSelectedForActiveSlot(t.topicKey);
                      return (
                        <tr key={t.topicKey}>
                          <td className="map-questions-td map-questions-td-check">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleObjectiveForSlot(t.topicKey)}
                            />
                          </td>
                          <td className="map-questions-td">{t.grade}</td>
                          <td className="map-questions-td">{t.courseCode}</td>
                          <td className="map-questions-td">{t.topicName}</td>
                          <td className="map-questions-td">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="map-questions-marks-input"
                              value={getObjectiveMarksForActiveSlot(t.topicKey)}
                              onChange={(e) => setSlotObjectiveMarks(t.topicKey, e.target.value)}
                              placeholder="0"
                              disabled={!selected}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="map-questions-slot-sum">
                Sum: {slotSumMarks(activeSlotKey)} / {expectedMarks}
                {isSlotDone(activeSlotKey) && ' ✓'}
              </p>
            </>
          )}
        </div>

        {createError && (
          <div className="map-questions-error" role="alert">
            {createError}
          </div>
        )}

        <div className="map-questions-actions">
          <button type="button" className="map-questions-cancel-btn" onClick={handleCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="map-questions-create-btn"
            onClick={handleCreate}
            disabled={submitting || !allSlotsDone}
          >
            {submitting ? 'Creating...' : 'Create course'}
          </button>
        </div>
        {!allSlotsDone && slots.length > 0 && (
          <p className="map-questions-validation-hint">
            Complete every question (and part): select at least one objective and set marks so the sum equals the slot marks. Buttons turn green when done.
          </p>
        )}
      </div>
    </div>
  );
};

export default MapCourseQuestions;
