import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import './Curriculum.css';

const Curriculum = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    ageGroup: '',
    grade: '',
    code: '',
    subject: '',
    topic: '',
    learningObjective: ''
  });

  // Course creation states
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTopics, setSelectedTopics] = useState([]);
  // Upload objectives state
  const [objectivesFile, setObjectivesFile] = useState(null);
  const [uploadingObjectives, setUploadingObjectives] = useState(false);
  const [lastUploadedFileKey, setLastUploadedFileKey] = useState(null);
  const objectivesInputId = 'objectives-file-input';
  const [singleObjectiveForm, setSingleObjectiveForm] = useState({ grade: '', subject: '', code: '', title: '', description: '' });
  const [objectivesUploadError, setObjectivesUploadError] = useState(null);
  const [addingObjective, setAddingObjective] = useState(false);
  const [deletingAllObjectives, setDeletingAllObjectives] = useState(false);
  const [deletingObjectiveKey, setDeletingObjectiveKey] = useState(null);
  const [objectivesSelectMode, setObjectivesSelectMode] = useState(false);
  const [selectedObjectives, setSelectedObjectives] = useState(new Set());
  const [deletingSelectedObjectives, setDeletingSelectedObjectives] = useState(false);
  const [editingObjectiveKey, setEditingObjectiveKey] = useState(null);
  const [editObjectiveForm, setEditObjectiveForm] = useState({ subject: '', title: '', description: '' });
  const [savingObjectiveKey, setSavingObjectiveKey] = useState(null);

  const fetchCurriculum = () => {
    return axios.get(`${API_URL}/api/curriculum`, {
      timeout: 30000,
    })
      .then(res => {
        setData(res.data);
        setFilteredData(res.data);
        setLoading(false);
        return res.data;
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        setLoading(false);
        throw err;
      });
  };

  // Fetch data from API
  useEffect(() => {
    setLoading(true);
    fetchCurriculum();
  }, []);

  const ageToGrades = React.useMemo(() => ({
    '4-5': [],
    '5-6': [1], '6-7': [2], '7-8': [3], '8-9': [4], '9-10': [5],
    '10-11': [6], '11-12': [7], '12-13': [8], '13-14': [9], '14-15': [10],
    '15-16': [11], '16-17': [12], '17-18': [13],
  }), []);

  // Data filtered by grade and/or age group only (used for subject options and cascading)
  const dataByGradeAndAge = React.useMemo(() => {
    let out = [...data];
    if (filters.grade) {
      out = out.filter(item => item.grade === Number(filters.grade));
    }
    if (filters.ageGroup && ageToGrades[filters.ageGroup]) {
      const gradesForAge = ageToGrades[filters.ageGroup];
      if (gradesForAge.length > 0) {
        out = out.filter(item => gradesForAge.includes(item.grade));
      } else {
        out = [];
      }
    }
    return out;
  }, [data, filters.grade, filters.ageGroup, ageToGrades]);

  // Apply filters whenever filters or data change
  useEffect(() => {
    let filtered = [...data];

    if (filters.grade) {
      filtered = filtered.filter(item => item.grade === Number(filters.grade));
    }
    if (filters.ageGroup && ageToGrades[filters.ageGroup]) {
      const gradesForAge = ageToGrades[filters.ageGroup];
      if (gradesForAge.length > 0) {
        filtered = filtered.filter(item => gradesForAge.includes(item.grade));
      } else {
        filtered = [];
      }
    }

    // Filter by subject: show only objectives whose subject matches the selected one
    if (filters.subject && String(filters.subject).trim() !== '') {
      const subjectLower = String(filters.subject).trim().toLowerCase();
      filtered = filtered.map(grade => {
        const objectives = grade.objectives || [];
        const filteredObjectives = objectives.filter(obj => {
          const objSubject = String(obj.subject ?? '').trim().toLowerCase();
          return objSubject === subjectLower;
        });
        return { ...grade, objectives: filteredObjectives };
      }).filter(grade => Array.isArray(grade.objectives) && grade.objectives.length > 0);
    }

    // Filter by code (exact match)
    if (filters.code) {
      filtered = filtered.map(grade => {
        const filteredObjectives = grade.objectives?.filter(obj =>
          obj.code && obj.code === filters.code
        ) || [];
        return { ...grade, objectives: filteredObjectives };
      }).filter(grade => grade.objectives && grade.objectives.length > 0);
    }

    // Filter by topic (matches objective title exactly)
    if (filters.topic) {
      filtered = filtered.map(grade => {
        const filteredObjectives = grade.objectives?.filter(obj => 
          obj.title && obj.title === filters.topic
        ) || [];
        
        return {
          ...grade,
          objectives: filteredObjectives
        };
      }).filter(grade => grade.objectives && grade.objectives.length > 0);
    }


    // Filter by learning objective (matches description)
    if (filters.learningObjective) {
      filtered = filtered.map(grade => {
        const filteredObjectives = grade.objectives?.filter(obj => 
          obj.description && obj.description.toLowerCase().includes(filters.learningObjective.toLowerCase())
        ) || [];
        
        return {
          ...grade,
          objectives: filteredObjectives
        };
      }).filter(grade => grade.objectives && grade.objectives.length > 0);
    }

    setFilteredData(filtered);
  }, [filters, data, ageToGrades]);

  // Handle filter changes; clear dependent filters when parent changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => {
      const next = { ...prev, [filterName]: value };
      if (filterName === 'grade' || filterName === 'ageGroup') {
        next.subject = '';
        next.code = '';
        next.topic = '';
        next.learningObjective = '';
      } else if (filterName === 'subject') {
        next.code = '';
        next.topic = '';
        next.learningObjective = '';
      }
      return next;
    });
  };

  const handleObjectivesFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const ok = /\.(xlsx|xls|csv)$/i.test(file.name);
      if (ok) {
        setObjectivesFile(file);
        setObjectivesUploadError(null);
      } else {
        setObjectivesUploadError({
          message: 'Invalid file type.',
          solution: 'Please select an Excel (.xlsx, .xls) or CSV file. Your file must have columns in this exact order: Grade, Subject, Code, Title, Description.',
        });
        e.target.value = '';
      }
    }
  };

  const getFileKey = (file) =>
    file ? `${file.name}-${file.size}-${file.lastModified || 0}` : null;

  const handleUploadObjectives = async () => {
    if (!objectivesFile) {
      setObjectivesUploadError({
        message: 'No file selected.',
        solution: 'Click "Upload Objectives" and choose an Excel or CSV file with columns in this exact order: Grade, Subject, Code, Title, Description.',
      });
      return;
    }
    const fileKey = getFileKey(objectivesFile);
    if (lastUploadedFileKey && fileKey === lastUploadedFileKey) {
      setObjectivesUploadError({
        message: 'This file was already uploaded.',
        solution: 'Select a different file to upload again, or make changes and re-upload.',
      });
      return;
    }
    const formData = new FormData();
    formData.append('file', objectivesFile);
    try {
      setUploadingObjectives(true);
      setObjectivesUploadError(null);
      const res = await axios.post(`${API_URL}/api/curriculum/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });
      if (res.data.success) {
        setLastUploadedFileKey(fileKey);
        setObjectivesFile(null);
        const input = document.getElementById(objectivesInputId);
        if (input) input.value = '';
        setFilters({
          ageGroup: '',
          grade: '',
          code: '',
          subject: '',
          topic: '',
          learningObjective: '',
        });
        setLoading(true);
        await fetchCurriculum();
      } else {
        setObjectivesUploadError({
          message: res.data.message || res.data.error || 'Upload failed.',
          solution: res.data.solution || 'Ensure your file has columns in this exact order: Grade, Subject, Code, Title, Description.',
        });
      }
    } catch (err) {
      const data = err.response?.data;
      setObjectivesUploadError({
        message: data?.message || data?.error || err.message || 'Upload failed.',
        solution: data?.solution || 'Ensure your Excel/CSV file has columns in this exact order: Grade, Subject, Code, Title, Description. Check that the first row contains these headers and that Grade contains numbers.',
      });
    } finally {
      setUploadingObjectives(false);
    }
  };

  const handleSingleObjectiveChange = (field, value) => {
    setSingleObjectiveForm(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSingleObjective = async (e) => {
    e.preventDefault();
    const { grade, subject, code, title, description } = singleObjectiveForm;
    if (!grade || parseInt(grade, 10) < 1) {
      alert('Please enter a valid grade (1 or higher).');
      return;
    }
    try {
      setAddingObjective(true);
      await axios.post(`${API_URL}/api/curriculum/objective`, {
        grade: parseInt(grade, 10),
        subject: subject != null ? String(subject).trim() : '',
        code: code != null ? String(code).trim() : '',
        title: title != null ? String(title).trim() : '',
        description: description != null ? String(description).trim() : '',
      });
      setSingleObjectiveForm({ grade: '', subject: '', code: '', title: '', description: '' });
      setFilters({ ageGroup: '', grade: '', code: '', subject: '', topic: '', learningObjective: '' });
      setLoading(true);
      await fetchCurriculum();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to add objective.';
      alert(msg);
    } finally {
      setAddingObjective(false);
    }
  };

  const handleDeleteAllObjectives = async () => {
    if (!window.confirm('Are you sure you want to delete ALL objectives? This cannot be undone.')) {
      return;
    }
    try {
      setDeletingAllObjectives(true);
      const res = await axios.delete(`${API_URL}/api/curriculum/all`);
      if (res.data.success) {
        alert(res.data.message || 'All objectives have been deleted.');
        setLoading(true);
        await fetchCurriculum();
      } else {
        alert(res.data.error || res.data.message || 'Failed to delete.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete objectives.';
      alert(msg);
    } finally {
      setDeletingAllObjectives(false);
    }
  };

  // Row-unique key for edit/save/delete and delete-selection (grade + index)
  const rowKey = (gradeNum, topicIndex) => `${gradeNum}::${topicIndex}`;
  const parseRowKey = (key) => {
    const i = key.indexOf('::');
    if (i === -1) return { grade: parseInt(key, 10), index: 0 };
    return { grade: parseInt(key.slice(0, i), 10), index: parseInt(key.slice(i + 2), 10) };
  };

  const handleDeleteObjective = async (grade, topicIndex, topic) => {
    const key = rowKey(grade.grade, topicIndex);
    const label = topic.title || topic.code || 'this objective';
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      setDeletingObjectiveKey(key);
      await axios.delete(`${API_URL}/api/curriculum/objective`, {
        data: { grade: grade.grade, index: topicIndex },
      });
      await fetchCurriculum();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete objective.';
      alert(msg);
    } finally {
      setDeletingObjectiveKey(null);
    }
  };

  const toggleObjectivesSelectMode = () => {
    setObjectivesSelectMode((prev) => !prev);
    if (objectivesSelectMode) setSelectedObjectives(new Set());
  };

  const toggleObjectiveSelection = (gradeNum, topicIndex) => {
    const key = rowKey(gradeNum, topicIndex);
    setSelectedObjectives((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSelectAllInGrade = (gradeNum, objectives, checked) => {
    setSelectedObjectives((prev) => {
      const next = new Set(prev);
      objectives.forEach((_, index) => next.add(rowKey(gradeNum, index)));
      if (!checked) objectives.forEach((_, index) => next.delete(rowKey(gradeNum, index)));
      return next;
    });
  };

  const handleDeleteSelectedObjectives = async () => {
      const items = Array.from(selectedObjectives).map((key) => {
        const { grade, index } = parseRowKey(key);
        return { grade, index };
      }).filter((item) => !isNaN(parseInt(item.grade, 10)) && !isNaN(parseInt(item.index, 10)));
    if (items.length === 0) return;
    if (!window.confirm(`Delete ${items.length} selected objective(s)? This cannot be undone.`)) return;
    try {
      setDeletingSelectedObjectives(true);
      await axios.delete(`${API_URL}/api/curriculum/objectives/selected`, { data: { items } });
      setSelectedObjectives(new Set());
      setObjectivesSelectMode(false);
      await fetchCurriculum();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete.';
      alert(msg);
    } finally {
      setDeletingSelectedObjectives(false);
    }
  };

  const handleEditObjectiveClick = (gradeNum, topicIndex, obj) => {
    setEditingObjectiveKey(rowKey(gradeNum, topicIndex));
    setEditObjectiveForm({
      subject: (obj.subject != null ? String(obj.subject) : '').trim(),
      title: (obj.title != null ? String(obj.title) : '').trim(),
      description: (obj.description != null ? String(obj.description) : '').trim(),
    });
  };

  const handleCancelEditObjective = () => {
    setEditingObjectiveKey(null);
    setEditObjectiveForm({ subject: '', title: '', description: '' });
  };

  const handleEditObjectiveFormChange = (field, value) => {
    setEditObjectiveForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveObjective = async (gradeNum, topicIndex) => {
    const key = rowKey(gradeNum, topicIndex);
    try {
      setSavingObjectiveKey(key);
      await axios.put(`${API_URL}/api/curriculum/objective`, {
        grade: gradeNum,
        index: topicIndex,
        subject: editObjectiveForm.subject.trim(),
        title: editObjectiveForm.title.trim(),
        description: editObjectiveForm.description.trim(),
      });
      await fetchCurriculum();
      setEditingObjectiveKey(null);
      setEditObjectiveForm({ subject: '', title: '', description: '' });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update.';
      alert(msg);
    } finally {
      setSavingObjectiveKey(null);
    }
  };

  // Handle create course button click
  const handleCreateCourseClick = () => {
    setIsSelectionMode(true);
    setSelectedTopics([]);
  };

  // Handle back to curriculum view (kept for potential future use)
  // const handleBackToCurriculum = () => {
  //   setCurrentView('curriculum');
  // };

  // Handle topic selection (when clicking on card in selection mode)
  const handleTopicSelect = (gradeId, courseIndex) => {
    const topicKey = `${gradeId}-${courseIndex}`;
    setSelectedTopics(prev => {
      if (prev.includes(topicKey)) {
        return prev.filter(key => key !== topicKey);
      } else {
        return [...prev, topicKey];
      }
    });
  };

  // Handle Next button click – go to create course page
  const handleNextClick = () => {
    if (selectedTopics.length > 0) {
      navigate('/create-course', { state: { selectedTopics, data } });
      setIsSelectionMode(false);
    }
  };

  // Handle cancel selection mode
  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedTopics([]);
  };

  // Select all objectives from a single grade (for course creation)
  const handleSelectAllFromGrade = (grade) => {
    if (!grade.objectives || grade.objectives.length === 0) return;
    const keysToAdd = grade.objectives.map((_, topicIndex) => `${grade._id}-${topicIndex}`);
    setSelectedTopics(prev => {
      const next = new Set(prev);
      keysToAdd.forEach(k => next.add(k));
      return Array.from(next);
    });
  };

  // Select all objectives from every grade (for course creation)
  const handleSelectAllFromAllGrades = () => {
    const keysToAdd = [];
    filteredData.forEach(grade => {
      if (grade.objectives && grade.objectives.length > 0) {
        grade.objectives.forEach((_, topicIndex) => keysToAdd.push(`${grade._id}-${topicIndex}`));
      }
    });
    setSelectedTopics(Array.from(new Set(keysToAdd)));
  };

  // Filter options: subjects from selected grade(s); code/topic/objective from grade + subject
  const getFilterOptions = () => {
    const subjectsSet = new Set();
    dataByGradeAndAge.forEach(grade => {
      (grade.objectives || []).forEach(obj => {
        const sub = String(obj.subject ?? '').trim();
        if (sub) subjectsSet.add(sub);
      });
    });
    const subjects = Array.from(subjectsSet).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // Data for code/topic/objective options: grade-filtered and optionally subject-filtered
    let dataForOptions = dataByGradeAndAge;
    if (filters.subject) {
      const subjectLower = String(filters.subject).trim().toLowerCase();
      dataForOptions = dataByGradeAndAge.map(grade => {
        const objs = (grade.objectives || []).filter(obj =>
          String(obj.subject || '').trim().toLowerCase() === subjectLower
        );
        return { ...grade, objectives: objs };
      }).filter(grade => (grade.objectives || []).length > 0);
    }

    const codes = new Set();
    const topics = new Set();
    const learningObjectives = new Set();
    dataForOptions.forEach(grade => {
      (grade.objectives || []).forEach(obj => {
        if (obj.code) codes.add(obj.code);
        if (obj.title) topics.add(obj.title);
        if (obj.description) {
          const descWords = obj.description.toLowerCase().split(/\s+/);
          descWords.forEach(word => {
            if (word.length > 4) learningObjectives.add(word);
          });
        }
      });
    });

    return {
      codes: Array.from(codes).sort(),
      subjects,
      topics: Array.from(topics).sort(),
      learningObjectives: Array.from(learningObjectives).slice(0, 50).sort(),
    };
  };

  const filterOptions = getFilterOptions();

  if (loading) {
    return (
      <div className="curriculum-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading curriculum data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="curriculum-container">
      <CurriculumHeader />
      
      <div className="filters-section">
          <div className="filter-group">
            <label htmlFor="age-group-filter" className="filter-label">Age Group</label>
            <select 
              id="age-group-filter" 
              className="filter-select"
              value={filters.ageGroup}
              onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
            >
              <option value="">All Ages (4-18 years)</option>
              <option value="4-5">4-5 years</option>
              <option value="5-6">5-6 years (Grade 1)</option>
              <option value="6-7">6-7 years (Grade 2)</option>
              <option value="7-8">7-8 years</option>
              <option value="8-9">8-9 years</option>
              <option value="9-10">9-10 years</option>
              <option value="10-11">10-11 years</option>
              <option value="11-12">11-12 years</option>
              <option value="12-13">12-13 years (Grade 8)</option>
              <option value="13-14">13-14 years</option>
              <option value="14-15">14-15 years</option>
              <option value="15-16">15-16 years</option>
              <option value="16-17">16-17 years</option>
              <option value="17-18">17-18 years</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="grade-filter" className="filter-label">Grade</label>
            <select 
              id="grade-filter" 
              className="filter-select"
              value={filters.grade}
              onChange={(e) => handleFilterChange('grade', e.target.value)}
            >
              <option value="">All Grades</option>
              <option value="1">Grade 1 (Year 5-6)</option>
              <option value="2">Grade 2 (Year 6-7)</option>
              <option value="3">Grade 3</option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
              <option value="6">Grade 6</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8 (Year 12-13)</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
              <option value="13">Grade 13</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="subject-filter" className="filter-label">Subject</label>
            <select 
              id="subject-filter" 
              className="filter-select"
              value={filters.subject}
              onChange={(e) => handleFilterChange('subject', e.target.value)}
            >
              <option value="">All Subjects</option>
              {filterOptions.subjects.map(subject => (
                <option key={subject} value={subject}>{subject.charAt(0).toUpperCase() + subject.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="code-filter" className="filter-label">Code</label>
            <select 
              id="code-filter" 
              className="filter-select"
              value={filters.code}
              onChange={(e) => handleFilterChange('code', e.target.value)}
            >
              <option value="">All Codes</option>
              {filterOptions.codes.map(code => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="topic-filter" className="filter-label">Topic</label>
            <select 
              id="topic-filter" 
              className="filter-select"
              value={filters.topic}
              onChange={(e) => handleFilterChange('topic', e.target.value)}
            >
              <option value="">All Topics</option>
              {filterOptions.topics.map(topic => (
                <option key={topic} value={topic}>{topic}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="objective-filter" className="filter-label">Learning Objective</label>
            <select 
              id="objective-filter" 
              className="filter-select"
              value={filters.learningObjective}
              onChange={(e) => handleFilterChange('learningObjective', e.target.value)}
            >
              <option value="">All Objectives</option>
              {filterOptions.learningObjectives.map(objective => (
                <option key={objective} value={objective}>{objective}</option>
              ))}
            </select>
          </div>
        </div>

        {objectivesUploadError && (
          <div className="objectives-upload-error" role="alert">
            <strong>Upload error:</strong> {objectivesUploadError.message}
            {objectivesUploadError.solution && (
              <p className="objectives-upload-error-solution">{objectivesUploadError.solution}</p>
            )}
          </div>
        )}

        <div className="add-single-objective-section">
          <h4 className="add-objective-heading">Add objective individually</h4>
          <form onSubmit={handleAddSingleObjective} className="add-objective-form">
            <input
              type="number"
              min="1"
              placeholder="Grade"
              value={singleObjectiveForm.grade}
              onChange={(e) => handleSingleObjectiveChange('grade', e.target.value)}
              className="add-objective-input"
              required
            />
            <input
              type="text"
              placeholder="Subject"
              value={singleObjectiveForm.subject}
              onChange={(e) => handleSingleObjectiveChange('subject', e.target.value)}
              className="add-objective-input"
            />
            <input
              type="text"
              placeholder="Code"
              value={singleObjectiveForm.code}
              onChange={(e) => handleSingleObjectiveChange('code', e.target.value)}
              className="add-objective-input"
            />
            <input
              type="text"
              placeholder="Title"
              value={singleObjectiveForm.title}
              onChange={(e) => handleSingleObjectiveChange('title', e.target.value)}
              className="add-objective-input"
            />
            <input
              type="text"
              placeholder="Description"
              value={singleObjectiveForm.description}
              onChange={(e) => handleSingleObjectiveChange('description', e.target.value)}
              className="add-objective-input add-objective-desc"
            />
            <button type="submit" className="add-objective-submit-btn" disabled={addingObjective}>
              {addingObjective ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              className="delete-all-objectives-btn"
              onClick={handleDeleteAllObjectives}
              disabled={deletingAllObjectives || data.length === 0}
            >
              {deletingAllObjectives ? 'Deleting...' : 'Delete all objectives'}
            </button>
          </form>
        </div>

        <p className="objectives-upload-hint">
          You are strictly required to follow the order of the columns in your Excel file. Use exactly this order: <strong>Grade</strong>, <strong>Subject</strong>, <strong>Code</strong>, <strong>Title</strong>, <strong>Description</strong>. The first row must be these headers; column names can vary slightly (e.g. Class for Grade, Topic for Title), but the column order must match.
        </p>

        <div className="upload-objectives-bar">
          <input
            id={objectivesInputId}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleObjectivesFileChange}
            className="objectives-file-input"
          />
          <button
            type="button"
            className="upload-objectives-btn"
            onClick={() => document.getElementById(objectivesInputId)?.click()}
          >
            Upload Objectives
          </button>
          {objectivesFile && (
            <>
              <span className="objectives-file-name">{objectivesFile.name}</span>
              <button
                type="button"
                className="upload-objectives-submit-btn"
                onClick={handleUploadObjectives}
                disabled={uploadingObjectives}
              >
                {uploadingObjectives ? 'Uploading...' : 'Upload file'}
              </button>
            </>
          )}
        </div>

        <div className="create-course-row">
          <button
            type="button"
            className="create-course-page-btn"
            onClick={handleCreateCourseClick}
          >
            + Create Courses
          </button>
        </div>

      {/* Selection Mode Banner */}
      {isSelectionMode && (
        <div className="selection-mode-banner">
          <div className="selection-mode-content">
            <p className="selection-mode-text">
              Select topics to include in your course. {selectedTopics.length > 0 && `(${selectedTopics.length} selected)`}
            </p>
            <div className="selection-mode-actions">
              {selectedTopics.length > 0 && (
                <button className="next-button" onClick={handleNextClick}>
                  Next
                </button>
              )}
              <button className="cancel-selection-button" onClick={handleCancelSelection}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results count indicator */}
      {!loading && !isSelectionMode && data.length > 0 && (
        <div className="results-count-indicator" style={{
          textAlign: 'center',
          marginBottom: '2rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <p style={{ margin: 0, color: '#5a6c7d', fontSize: '0.95rem' }}>
            Showing <strong style={{ color: '#2c3e50' }}>{filteredData.length}</strong> of <strong style={{ color: '#2c3e50' }}>{data.length}</strong> grade{data.length !== 1 ? 's' : ''}
            {(filters.grade || filters.ageGroup || filters.code || filters.subject || filters.topic || filters.learningObjective) && (
              <span style={{ marginLeft: '0.5rem', color: '#3498db' }}>
                (filtered)
              </span>
            )}
          </p>
        </div>
      )}

      {filteredData.length === 0 && !loading ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          {data.length === 0 ? (
            <>
              <h2>No Curriculum Data Found</h2>
              <p>The database appears to be empty or the API call failed.</p>
              <p className="empty-hint">Please check:</p>
              <ul style={{textAlign: 'left', display: 'inline-block', marginTop: '1rem', color: '#e74c3c'}}>
                <li>✅ Backend server is running on {API_URL}</li>
                <li>⚠️ MongoDB Atlas connection is established</li>
                <li>⚠️ Your IP address is whitelisted in MongoDB Atlas</li>
                <li>⚠️ Data exists in the SchoolCurriculum.objectives collection</li>
                <li>📋 Check browser console (F12) for detailed error messages</li>
              </ul>
              <p style={{marginTop: '1.5rem', color: '#e74c3c', fontWeight: '600'}}>
                💡 To whitelist your IP: Go to MongoDB Atlas → Network Access → Add IP Address
              </p>
            </>
          ) : (
            <>
              <h2>No Results Found</h2>
              <p>No curriculum data matches the selected filters.</p>
              <p className="empty-hint" style={{marginTop: '1rem'}}>
                Try adjusting your filter selections to see more results.
              </p>
              <button 
                onClick={() => setFilters({
                  ageGroup: '',
                  grade: '',
                  code: '',
                  subject: '',
                  topic: '',
                  learningObjective: ''
                })}
                style={{
                  marginTop: '1.5rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: '#3498db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#2980b9';
                  e.target.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#3498db';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                Clear All Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grades-section">
          <div className="objectives-table-actions">
            <button
              type="button"
              className={objectivesSelectMode ? 'objectives-select-btn active' : 'objectives-select-btn'}
              onClick={toggleObjectivesSelectMode}
              disabled={deletingSelectedObjectives}
            >
              {objectivesSelectMode ? 'Cancel' : 'Select'}
            </button>
            {objectivesSelectMode && (
              <button
                type="button"
                className="objectives-delete-selected-btn"
                onClick={handleDeleteSelectedObjectives}
                disabled={selectedObjectives.size === 0 || deletingSelectedObjectives}
              >
                {deletingSelectedObjectives ? 'Deleting...' : `Delete selected (${selectedObjectives.size})`}
              </button>
            )}
          </div>
          {isSelectionMode && (
            <div className="course-select-all-row">
              <button
                type="button"
                className="course-select-all-btn"
                onClick={handleSelectAllFromAllGrades}
              >
                Select all
              </button>
            </div>
          )}
          {filteredData.map((grade) => (
            <div key={grade._id || grade.grade} className="grade-section">
              <div className="grade-heading-wrapper">
                <h2 className="grade-main-heading">Grade {grade.grade}</h2>
                {isSelectionMode && grade.objectives && grade.objectives.length > 0 && (
                  <button
                    type="button"
                    className="course-select-grade-btn"
                    onClick={() => handleSelectAllFromGrade(grade)}
                  >
                    Select all from Grade {grade.grade}
                  </button>
                )}
                <div className="grade-divider-line"></div>
              </div>
              {grade.objectives && grade.objectives.length > 0 ? (
                <div className="objectives-table-wrapper">
                  <table className="objectives-table">
                    <thead>
                      <tr>
                        {objectivesSelectMode && (
                          <th className="objectives-th-checkbox">
                            <input
                              type="checkbox"
                              aria-label="Select all in grade"
                              checked={grade.objectives.length > 0 && grade.objectives.every((_, i) => selectedObjectives.has(rowKey(grade.grade, i)))}
                              onChange={(e) => handleSelectAllInGrade(grade.grade, grade.objectives, e.target.checked)}
                            />
                          </th>
                        )}
                        {isSelectionMode && (
                          <th className="objectives-th-checkbox">Add to course</th>
                        )}
                        <th className="objectives-th-srno">Sr. No</th>
                        <th>Grade</th>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grade.objectives.map((topic, topicIndex) => {
                        const rowId = rowKey(grade.grade, topicIndex);
                        const topicKey = `${grade._id}-${topicIndex}`;
                        const isSelectedForCourse = selectedTopics.includes(topicKey);
                        const isEditing = editingObjectiveKey === rowId;
                        const isSaving = savingObjectiveKey === rowId;
                        const isDeleting = deletingObjectiveKey === rowId;
                        return (
                          <tr key={topic.code || topicIndex} className={isEditing ? 'objectives-row-editing' : ''}>
                            {objectivesSelectMode && (
                              <td className="objectives-td-checkbox">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${topic.code}`}
                                  checked={selectedObjectives.has(rowKey(grade.grade, topicIndex))}
                                  onChange={() => toggleObjectiveSelection(grade.grade, topicIndex)}
                                />
                              </td>
                            )}
                            {isSelectionMode && (
                              <td className="objectives-td-checkbox">
                                <input
                                  type="checkbox"
                                  aria-label={`Add to course ${topic.code}`}
                                  checked={isSelectedForCourse}
                                  onChange={() => handleTopicSelect(grade._id, topicIndex)}
                                />
                              </td>
                            )}
                            <td className="objectives-td-srno">{topicIndex + 1}</td>
                            <td>{grade.grade}</td>
                            <td>{isEditing ? (
                              <input
                                type="text"
                                className="objectives-edit-input"
                                value={editObjectiveForm.subject}
                                onChange={(e) => handleEditObjectiveFormChange('subject', e.target.value)}
                                placeholder="Subject"
                              />
                            ) : (topic.subject || '-')}</td>
                            <td>{topic.code || '-'}</td>
                            {isEditing ? (
                              <>
                                <td>
                                  <input
                                    type="text"
                                    className="objectives-edit-input"
                                    value={editObjectiveForm.title}
                                    onChange={(e) => handleEditObjectiveFormChange('title', e.target.value)}
                                    placeholder="Title"
                                  />
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    className="objectives-edit-input"
                                    value={editObjectiveForm.description}
                                    onChange={(e) => handleEditObjectiveFormChange('description', e.target.value)}
                                    placeholder="Description"
                                  />
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="objectives-save-btn"
                                    onClick={() => handleSaveObjective(grade.grade, topicIndex)}
                                    disabled={isSaving}
                                  >
                                    {isSaving ? 'Saving...' : 'Save'}
                                  </button>
                                  <button
                                    type="button"
                                    className="objectives-cancel-btn"
                                    onClick={handleCancelEditObjective}
                                    disabled={isSaving}
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>{topic.title || '-'}</td>
                                <td className="objectives-desc-cell">{topic.description || '-'}</td>
                                <td className="objectives-action-cell">
                                  <button
                                    type="button"
                                    className="objectives-action-btn objectives-edit-btn"
                                    onClick={() => handleEditObjectiveClick(grade.grade, topicIndex, topic)}
                                    title="Edit"
                                    aria-label="Edit"
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    className="objectives-action-btn objectives-delete-btn"
                                    onClick={() => handleDeleteObjective(grade, topicIndex, topic)}
                                    disabled={isDeleting}
                                    title="Delete"
                                    aria-label="Delete"
                                  >
                                    {isDeleting ? (
                                      <span className="objectives-delete-spinner">...</span>
                                    ) : (
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6" />
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        <line x1="10" y1="11" x2="10" y2="17" />
                                        <line x1="14" y1="11" x2="14" y2="17" />
                                      </svg>
                                    )}
                                  </button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-topics">
                  <p>No objectives for this grade.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

export default Curriculum;
