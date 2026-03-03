import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CurriculumHeader from './CurriculumHeader';
import './CreateCourseMarks.css';

const slotKey = (q, part) => (part === 0 ? `q${q}` : `q${q}-p${part}`);

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
  const [createError, setCreateError] = useState(null);

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
      if (n <= 0) {
        list.push({ questionIndex: q, partIndex: 0, label: `Q${q}`, partLabel: null });
      } else {
        for (let part = 1; part <= n; part++) {
          list.push({
            questionIndex: q,
            partIndex: part,
            label: `Q${q}`,
            partLabel: `Part ${part}`,
          });
        }
      }
    });
    return list;
  }, [questionParts]);

  const sumMarks = useMemo(
    () => slots.reduce((s, sl) => s + (Number(marksBySlot[slotKey(sl.questionIndex, sl.partIndex)]) || 0), 0),
    [slots, marksBySlot]
  );
  const totalValid = totalMarks > 0 && Math.abs(sumMarks - totalMarks) < 0.01;

  const handleMarksChange = (q, part, value) => {
    setMarksBySlot((prev) => ({ ...prev, [slotKey(q, part)]: value }));
    setCreateError(null);
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleNext = () => {
    if (!coursePayload) {
      setCreateError('Missing course data. Please go back and complete the course form.');
      return;
    }
    if (!totalValid) {
      setCreateError(`Total marks must equal ${totalMarks}. Current sum: ${sumMarks}.`);
      return;
    }

    const questionPartMarks = slots.map((sl) => ({
      questionIndex: sl.questionIndex,
      partIndex: sl.partIndex,
      marks: Number(marksBySlot[slotKey(sl.questionIndex, sl.partIndex)]) || 0,
    }));

    navigate('/create-course/map-questions', {
      state: {
        coursePayload,
        totalQuestions: totalQuestionsFromState,
        questionParts,
        questionPartMarks,
        resolvedTopics,
      },
    });
  };

  if (!coursePayload || !totalQuestionsFromState) {
    return (
      <div className="create-course-marks-container">
        <CurriculumHeader />
        <div className="create-course-marks-content">
          <p className="create-course-marks-missing">Missing course data. Please start from the Create Course page.</p>
          <button type="button" className="create-course-marks-back-btn" onClick={() => navigate('/create-course')}>
            Back to Create Course
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
          Enter marks for each question (and each part if applicable). Total must equal <strong>{totalMarks}</strong>.
        </p>

        <div className="create-course-marks-table-wrapper">
          <table className="create-course-marks-table">
            <thead>
              <tr>
                <th>Question</th>
                <th>Part</th>
                <th>Marks</th>
              </tr>
            </thead>
            <tbody>
              {slots.map((sl) => (
                <tr key={slotKey(sl.questionIndex, sl.partIndex)}>
                  <td className="marks-q-cell">{sl.label}</td>
                  <td className="marks-part-cell">{sl.partLabel != null ? sl.partLabel : '—'}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="marks-slot-input"
                      value={marksBySlot[slotKey(sl.questionIndex, sl.partIndex)] ?? ''}
                      onChange={(e) => handleMarksChange(sl.questionIndex, sl.partIndex, e.target.value)}
                      placeholder="0"
                      aria-label={`Marks for ${sl.label}${sl.partLabel ? ` ${sl.partLabel}` : ''}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className={`create-course-marks-sum ${!totalValid && sumMarks > 0 ? 'create-course-marks-sum-error' : ''}`}>
          Total: <strong>{sumMarks}</strong> / {totalMarks}
        </p>
        {createError && (
          <div className="create-course-marks-error" role="alert">
            {createError}
          </div>
        )}
        <div className="create-course-marks-actions">
          <button type="button" className="create-course-marks-back-btn" onClick={handleBack}>
            Back
          </button>
          <button
            type="button"
            className="create-course-marks-next-btn"
            onClick={handleNext}
            disabled={!totalValid}
          >
            Map questions to objectives
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCourseMarks;
