import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CurriculumHeader from './CurriculumHeader';
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
  const [objectiveMarks, setObjectiveMarks] = useState({});
  const [createError, setCreateError] = useState(null);

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
      };
    }).filter(Boolean);
  }, [selectedTopics, curriculumData]);

  const sumObjectiveMarks = useMemo(() => {
    return resolvedTopics.reduce((sum, t) => sum + (Number(objectiveMarks[t.topicKey]) || 0), 0);
  }, [resolvedTopics, objectiveMarks]);

  const enteredTotalMarks = Number(formData.totalMarks);
  const totalMarksValid = !Number.isNaN(enteredTotalMarks) && enteredTotalMarks > 0;
  const marksError = resolvedTopics.length > 0 && totalMarksValid && Math.abs(sumObjectiveMarks - enteredTotalMarks) > 0.01;

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

  const handleMarksChange = (topicKey, value) => {
    setObjectiveMarks(prev => ({ ...prev, [topicKey]: value }));
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
    if (Math.abs(sumObjectiveMarks - totalMarksNum) > 0.01) {
      setCreateError(`Total marks for all objectives must equal ${totalMarksNum}.`);
      return;
    }

    const totalQuestionsNum = parseInt(formData.totalQuestions, 10);
    if (Number.isNaN(totalQuestionsNum) || totalQuestionsNum < 1) {
      setCreateError('Please enter a valid total questions (number greater than 0).');
      return;
    }

    const topics = resolvedTopics.map(t => ({
      courseCode: t.courseCode,
      topicName: t.topicName,
      marks: Number(objectiveMarks[t.topicKey]) || 0,
      grade: t.grade,
    }));

    const coursePayload = {
      courseName: formData.courseName.trim(),
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
      topics,
    };

    navigate('/create-course/map-questions', {
      state: {
        coursePayload,
        totalQuestions: totalQuestionsNum,
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
              <span className="form-hint">Sum of all objective marks below must equal this value.</span>
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
              <span className="form-hint">Number of questions in the course. You will map objectives to each question on the next step.</span>
            </div>
          </div>

          <div className="objectives-marks-section">
            <h3 className="objectives-marks-heading">
              Selected objectives – enter marks (total must equal {formData.totalMarks ? formData.totalMarks : '—'})
            </h3>
            <div className="objectives-marks-table-wrapper">
              <table className="objectives-marks-table">
                <thead>
                  <tr>
                    <th>Grade</th>
                    <th>Code</th>
                    <th>Title</th>
                    <th>Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvedTopics.map(t => (
                    <tr key={t.topicKey}>
                      <td>{t.grade}</td>
                      <td>{t.courseCode}</td>
                      <td>{t.topicName}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="marks-input"
                          value={objectiveMarks[t.topicKey] ?? ''}
                          onChange={(e) => handleMarksChange(t.topicKey, e.target.value)}
                          placeholder="0"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className={`marks-total ${marksError ? 'marks-total-error' : ''}`}>
              Total marks: <strong>{sumObjectiveMarks}</strong>
              {formData.totalMarks ? ` / ${formData.totalMarks}` : ''}
            </p>
            {marksError && formData.totalMarks && (
              <p className="marks-error-msg">Sum of objective marks must equal {formData.totalMarks}.</p>
            )}
            {resolvedTopics.length > 0 && formData.totalMarks && !totalMarksValid && (
              <p className="marks-error-msg">Please enter a valid total marks above.</p>
            )}
          </div>

          {createError && (
            <div className="create-course-error" role="alert">
              {createError}
            </div>
          )}

          <div className="create-course-actions">
            <button type="button" className="create-course-cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="create-course-submit-btn">
              Next: Map questions to objectives
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateCourse;
