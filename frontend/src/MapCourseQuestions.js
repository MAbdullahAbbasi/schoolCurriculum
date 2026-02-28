import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './MapCourseQuestions.css';

const MapCourseQuestions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { coursePayload = null, totalQuestions: totalQuestionsFromState = 0, resolvedTopics = [] } = location.state || {};

  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionObjectivesMap, setQuestionObjectivesMap] = useState(() => {
    const map = {};
    for (let q = 1; q <= (totalQuestionsFromState || 0); q++) {
      map[q] = new Set();
    }
    return map;
  });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const totalQuestions = totalQuestionsFromState || 0;
  const questionNumbers = useMemo(() => {
    const arr = [];
    for (let i = 1; i <= totalQuestions; i++) arr.push(i);
    return arr;
  }, [totalQuestions]);

  const isObjectiveSelectedForCurrentQuestion = (topicKey) => {
    if (!selectedQuestion) return false;
    const set = questionObjectivesMap[selectedQuestion];
    return set ? set.has(topicKey) : false;
  };

  const toggleObjectiveForQuestion = (topicKey) => {
    if (!selectedQuestion) return;
    setQuestionObjectivesMap(prev => {
      const next = { ...prev };
      const set = new Set(next[selectedQuestion] || []);
      if (set.has(topicKey)) {
        set.delete(topicKey);
      } else {
        set.add(topicKey);
      }
      next[selectedQuestion] = set;
      return next;
    });
    setCreateError(null);
  };

  const selectAllObjectivesForCurrentQuestion = (checked) => {
    if (!selectedQuestion) return;
    setQuestionObjectivesMap(prev => {
      const next = { ...prev };
      if (checked) {
        next[selectedQuestion] = new Set(resolvedTopics.map(t => t.topicKey));
      } else {
        next[selectedQuestion] = new Set();
      }
      return next;
    });
    setCreateError(null);
  };

  const allQuestionsHaveObjectives = useMemo(() => {
    for (let q = 1; q <= totalQuestions; q++) {
      const set = questionObjectivesMap[q];
      if (!set || set.size === 0) return false;
    }
    return totalQuestions > 0;
  }, [questionObjectivesMap, totalQuestions]);

  const buildQuestionsPayload = () => {
    return questionNumbers.map(q => {
      const set = questionObjectivesMap[q] || new Set();
      const topicIndices = resolvedTopics
        .map((t, idx) => (set.has(t.topicKey) ? idx : -1))
        .filter(i => i >= 0);
      return { questionIndex: q, topicIndices };
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!coursePayload) {
      setCreateError('Missing course data. Please go back and complete the course form.');
      return;
    }

    if (!allQuestionsHaveObjectives) {
      setCreateError('Please select at least one objective for every question (Q1–Q' + totalQuestions + ').');
      return;
    }

    const questions = buildQuestionsPayload();
    const payload = {
      ...coursePayload,
      totalQuestions,
      questions,
    };

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
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to create course.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/', { replace: true });
  };

  if (!coursePayload || totalQuestions < 1 || resolvedTopics.length === 0) {
    return (
      <div className="map-questions-container">
        <CurriculumHeader />
        <div className="map-questions-content">
          <p className="map-questions-missing">Missing course data or objectives. Please start from the curriculum and create course again.</p>
          <button type="button" className="map-questions-back-btn" onClick={() => navigate('/')}>
            Back to Curriculum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="map-questions-container">
      <CurriculumHeader />
      <div className="map-questions-content">
        <h2 className="map-questions-title">Map objectives to questions</h2>
        <p className="map-questions-subtitle">
          Select a question (Q1–Q{totalQuestions}), then choose which objectives apply to that question.
        </p>

        <div className="map-questions-buttons">
          {questionNumbers.map(q => (
            <button
              key={q}
              type="button"
              className={`map-q-btn ${selectedQuestion === q ? 'map-q-btn-active' : ''}`}
              onClick={() => setSelectedQuestion(q)}
            >
              Q{q}
            </button>
          ))}
        </div>

        <div className="map-questions-table-section">
          {selectedQuestion == null ? (
            <p className="map-questions-prompt">Select a question above to assign objectives to it.</p>
          ) : (
            <>
              <div className="map-questions-table-header-row">
                <h3 className="map-questions-table-heading">Objectives for Q{selectedQuestion}</h3>
                <label className="map-questions-select-all-label">
                  <input
                    type="checkbox"
                    checked={
                      resolvedTopics.length > 0 &&
                      resolvedTopics.every(t => isObjectiveSelectedForCurrentQuestion(t.topicKey))
                    }
                    onChange={(e) => selectAllObjectivesForCurrentQuestion(e.target.checked)}
                  />
                  <span>Select all</span>
                </label>
              </div>
              <div className="map-questions-table-wrapper">
                <table className="map-questions-table">
                  <thead>
                    <tr>
                      <th className="map-questions-th map-questions-th-check">Select</th>
                      <th className="map-questions-th">Grade</th>
                      <th className="map-questions-th">Code</th>
                      <th className="map-questions-th">Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvedTopics.map(t => (
                      <tr key={t.topicKey}>
                        <td className="map-questions-td map-questions-td-check">
                          <input
                            type="checkbox"
                            checked={isObjectiveSelectedForCurrentQuestion(t.topicKey)}
                            onChange={() => toggleObjectiveForQuestion(t.topicKey)}
                          />
                        </td>
                        <td className="map-questions-td">{t.grade}</td>
                        <td className="map-questions-td">{t.courseCode}</td>
                        <td className="map-questions-td">{t.topicName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {createError && (
          <div className="map-questions-error" role="alert">
            {createError}
          </div>
        )}

        <div className="map-questions-actions">
          <button
            type="button"
            className="map-questions-cancel-btn"
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="map-questions-create-btn"
            onClick={handleCreate}
            disabled={submitting || !allQuestionsHaveObjectives}
          >
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
        {!allQuestionsHaveObjectives && totalQuestions > 0 && (
          <p className="map-questions-validation-hint">
            Select at least one objective for each question (Q1–Q{totalQuestions}) to enable Create.
          </p>
        )}
      </div>
    </div>
  );
};

export default MapCourseQuestions;
