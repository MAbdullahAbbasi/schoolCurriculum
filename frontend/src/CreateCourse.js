import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CurriculumHeader from './CurriculumHeader';
import { IconCancel, IconNext } from './ButtonIcons';
import './CreateCourse.css';

const defaultFormData = {
  courseName: '',
  durationType: '',
  durationValue: '',
  weightageItems: [
    { id: 1, label: 'assignment', checked: false, percentage: '' },
    { id: 2, label: 'paper', checked: false, percentage: '' },
    { id: 3, label: 'quiz', checked: false, percentage: '' },
    { id: 4, label: 'presentation', checked: false, percentage: '' },
  ],
  startDate: '',
  totalMarks: '',
  totalQuestions: '',
};

const CreateCourse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedTopics = [], data: curriculumData = [] } = location.state || {};

  const [formData, setFormData] = useState(defaultFormData);
  const [questionParts, setQuestionParts] = useState([]);
  const [createError, setCreateError] = useState(null);

  const totalQuestionsNum = useMemo(() => {
    const n = parseInt(formData.totalQuestions, 10);
    return Number.isNaN(n) || n < 1 ? 0 : n;
  }, [formData.totalQuestions]);

  React.useEffect(() => {
    if (totalQuestionsNum <= 0) {
      setQuestionParts([]);
      return;
    }
    setQuestionParts(prev => {
      const next = [...prev];
      while (next.length < totalQuestionsNum) {
        next.push({ numParts: '', compulsoryParts: '' });
      }
      return next.slice(0, totalQuestionsNum);
    });
  }, [totalQuestionsNum]);

  const resolvedTopics = useMemo(() => {
    if (!Array.isArray(selectedTopics) || !Array.isArray(curriculumData)) return [];
    return selectedTopics.map(topicKey => {
      const lastDash = topicKey.lastIndexOf('-');
      const gradeId = lastDash === -1 ? topicKey : topicKey.slice(0, lastDash);
      const topicIndexStr = lastDash === -1 ? '' : topicKey.slice(lastDash + 1);
      const topicIndex = parseInt(topicIndexStr, 10);
      const grade = curriculumData.find(g => g._id === gradeId || String(g._id) === gradeId);
      if (!grade || !grade.objectives || !grade.objectives[topicIndex]) return null;
      const topic = grade.objectives[topicIndex];
      return {
        topicKey,
        grade: grade.grade,
        courseCode: topic.code || '',
        topicName: topic.title || '',
        description: topic.description || '',
        subject: (topic.subject != null ? String(topic.subject).trim() : '') || '',
      };
    }).filter(Boolean);
  }, [selectedTopics, curriculumData]);

  const handleQuestionPartChange = (questionIndex, field, value) => {
    setQuestionParts(prev => {
      const next = [...prev];
      if (!next[questionIndex]) next[questionIndex] = { numParts: '', compulsoryParts: '' };
      next[questionIndex] = { ...next[questionIndex], [field]: value };
      return next;
    });
    setCreateError(null);
  };

  React.useEffect(() => {
    if (resolvedTopics.length === 0) {
      navigate('/', { replace: true });
    }
  }, [resolvedTopics.length, navigate]);

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setCreateError(null);
  };

  const handleDurationTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      durationType: prev.durationType === type ? '' : type,
      durationValue: prev.durationType === type ? '' : prev.durationValue,
    }));
    setCreateError(null);
  };

  const handleWeightageCheckboxChange = (id, checked) => {
    setFormData(prev => ({
      ...prev,
      weightageItems: prev.weightageItems.map(item =>
        item.id === id ? { ...item, checked } : item
      ),
    }));
    setCreateError(null);
  };

  const handleWeightagePercentageChange = (id, percentage) => {
    setFormData(prev => ({
      ...prev,
      weightageItems: prev.weightageItems.map(item =>
        item.id === id ? { ...item, percentage } : item
      ),
    }));
    setCreateError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreateError(null);

    if (!formData.courseName?.trim()) {
      setCreateError('Course name is required.');
      return;
    }
    if (!formData.durationType || !formData.durationValue) {
      setCreateError('Duration is required.');
      return;
    }
    const checkedWeightage = formData.weightageItems.filter(item => item.checked);
    if (checkedWeightage.length === 0) {
      setCreateError('At least one weightage item is required.');
      return;
    }
    const weightageTotal = checkedWeightage.reduce((sum, item) => sum + (Number(item.percentage) || 0), 0);
    if (Math.abs(weightageTotal - 100) > 0.01) {
      setCreateError('Weightage must total 100%.');
      return;
    }
    if (!formData.startDate) {
      setCreateError('Starting date is required.');
      return;
    }
    const totalMarksNum = Number(formData.totalMarks);
    if (Number.isNaN(totalMarksNum) || totalMarksNum < 1) {
      setCreateError('Please enter a valid total marks (number greater than 0).');
      return;
    }

    const totalQuestionsNum = parseInt(formData.totalQuestions, 10);
    if (Number.isNaN(totalQuestionsNum) || totalQuestionsNum < 1) {
      setCreateError('Please enter a valid total questions (number greater than 0).');
      return;
    }

    const partsConfig = questionParts.slice(0, totalQuestionsNum).map((row, i) => ({
      questionIndex: i + 1,
      numParts: row.numParts === '' ? 0 : Math.max(0, parseInt(String(row.numParts).trim(), 10) || 0),
      compulsoryParts: row.compulsoryParts === '' ? 0 : Math.max(0, parseInt(String(row.compulsoryParts).trim(), 10) || 0),
    }));

    for (let i = 0; i < partsConfig.length; i++) {
      const p = partsConfig[i];
      if (p.numParts > 0 && p.compulsoryParts > p.numParts) {
        setCreateError(`Q${i + 1}: Compulsory parts cannot exceed number of parts.`);
        return;
      }
    }

    const coursePayload = {
      courseName: formData.courseName.trim(),
      subject: resolvedTopics[0]?.subject ?? '',
      courseDuration: {
        type: formData.durationType,
        value: Number(formData.durationValue),
      },
      weightage: checkedWeightage.map(item => ({
        label: item.label,
        percentage: Number(item.percentage),
      })),
      startingDate: formData.startDate,
      totalMarks: totalMarksNum,
      totalQuestions: totalQuestionsNum,
    };

    navigate('/create-course/marks', {
      state: {
        coursePayload,
        totalQuestions: totalQuestionsNum,
        questionParts: partsConfig,
        resolvedTopics,
      },
    });
  };

  const handleCancel = () => {
    navigate(-1);
  };

  if (resolvedTopics.length === 0 && selectedTopics.length > 0) {
    return (
      <div className="create-course-container">
        <CurriculumHeader />
        <div className="create-course-loading">Loading...</div>
      </div>
    );
  }

  if (resolvedTopics.length === 0) {
    return null;
  }

  return (
    <div className="create-course-container">
      <CurriculumHeader />
      <div className="create-course-content">
        <h2 className="create-course-title">Create Course</h2>

        <form onSubmit={handleSubmit} className="create-course-form">
          <div className="create-course-fields">
            <div className="form-field">
              <label htmlFor="course-name" className="form-label">Course Name</label>
              <input
                type="text"
                id="course-name"
                className="course-name-input"
                placeholder="Enter course name"
                value={formData.courseName}
                onChange={(e) => handleFormChange('courseName', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Duration</label>
              <div className="duration-options">
                {['days', 'weeks', 'months'].map(type => (
                  <label key={type} className="duration-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.durationType === type}
                      onChange={() => handleDurationTypeChange(type)}
                    />
                    <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                  </label>
                ))}
              </div>
              {formData.durationType && (
                <div className="duration-input-wrapper">
                  <input
                    type="number"
                    min="1"
                    className="duration-input"
                    placeholder="Enter duration"
                    value={formData.durationValue}
                    onChange={(e) => handleFormChange('durationValue', e.target.value)}
                  />
                  <span className="duration-unit">{formData.durationType}</span>
                </div>
              )}
            </div>

            <div className="form-field">
              <label className="form-label">Weightage</label>
              <div className="weightage-items">
                {formData.weightageItems.map(item => (
                  <div key={item.id} className="weightage-item">
                    <label className="weightage-checkbox-label">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => handleWeightageCheckboxChange(item.id, e.target.checked)}
                      />
                      <span className="weightage-label-text">{item.label.charAt(0).toUpperCase() + item.label.slice(1)}</span>
                    </label>
                    {item.checked && (
                      <div className="weightage-percentage-wrapper">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="weightage-percentage-input"
                          placeholder="%"
                          value={item.percentage}
                          onChange={(e) => handleWeightagePercentageChange(item.id, e.target.value)}
                        />
                        <span className="percentage-symbol">%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="start-date" className="form-label">Starting Date</label>
              <input
                type="date"
                id="start-date"
                className="date-input"
                value={formData.startDate}
                onChange={(e) => handleFormChange('startDate', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="total-marks" className="form-label">Total Marks</label>
              <input
                type="number"
                id="total-marks"
                min="1"
                step="1"
                className="total-marks-input"
                placeholder="e.g. 100"
                value={formData.totalMarks}
                onChange={(e) => handleFormChange('totalMarks', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label htmlFor="total-questions" className="form-label">Total Questions</label>
              <input
                type="number"
                id="total-questions"
                min="1"
                step="1"
                className="total-questions-input"
                placeholder="e.g. 5"
                value={formData.totalQuestions}
                onChange={(e) => handleFormChange('totalQuestions', e.target.value)}
              />
              <span className="form-hint">Enter number of questions. Then set parts per question below and press Next.</span>
            </div>

          </div>

          {totalQuestionsNum > 0 && (
            <div className="questions-parts-section">
              <h3 className="questions-parts-heading">Questions and parts</h3>
              <p className="questions-parts-hint">Enter number of parts per question (leave empty if no parts). If a question has parts, optionally enter compulsory parts to be attempted.</p>
              <div className="questions-parts-table-wrapper">
                <table className="questions-parts-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Number of parts</th>
                      <th>Compulsory parts to be attempted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {questionParts.map((row, idx) => (
                      <tr key={idx}>
                        <td className="question-label-cell">Q{idx + 1}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="parts-input"
                            placeholder="None"
                            value={row.numParts}
                            onChange={(e) => handleQuestionPartChange(idx, 'numParts', e.target.value)}
                            aria-label={`Parts for Q${idx + 1}`}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="parts-input"
                            placeholder="—"
                            value={row.compulsoryParts}
                            onChange={(e) => handleQuestionPartChange(idx, 'compulsoryParts', e.target.value)}
                            aria-label={`Compulsory parts for Q${idx + 1}`}
                            disabled={!(Number(row.numParts) > 0)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {createError && (
            <div className="create-course-error" role="alert">
              {createError}
            </div>
          )}

          <div className="create-course-actions">
            <button type="button" className="create-course-cancel-btn" onClick={handleCancel}>
              <span className="btn-icon-wrap"><IconCancel />Cancel</span>
            </button>
            <button type="submit" className="create-course-submit-btn" disabled={totalQuestionsNum < 1}>
              <span className="btn-icon-wrap"><IconNext />Next</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;
