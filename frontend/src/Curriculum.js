import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import StudentData from './StudentData';
import { API_URL } from './config/api';
import './Curriculum.css';

const Curriculum = () => {
  const [currentView, setCurrentView] = useState('curriculum'); // 'curriculum' or 'studentsData'
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  
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
  const [showForm, setShowForm] = useState(false);
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
  const [formData, setFormData] = useState({
    courseName: '',
    durationType: '', // 'days', 'weeks', 'months'
    durationValue: '',
    weightageItems: [
      { id: 1, label: 'assignment', checked: false, percentage: '' },
      { id: 2, label: 'paper', checked: false, percentage: '' },
      { id: 3, label: 'quiz', checked: false, percentage: '' },
      { id: 4, label: 'presentation', checked: false, percentage: '' }
    ],
    startDate: ''
  });

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

  // Apply filters whenever filters or data change
  useEffect(() => {
    let filtered = [...data];

    // Filter by grade
    if (filters.grade) {
      filtered = filtered.filter(item => item.grade === Number(filters.grade));
    }

    // Filter by age group - maps age ranges to grades
    if (filters.ageGroup) {
      // Age to Grade mapping based on user requirements
      // Grade 1: Year 5-6, Grade 2: Year 6-7, Grade 8: Year 12-13
      // Service range: 4-15 years (learners), but will entertain up to 18 years
      const ageToGrades = {
        '4-5': [], // Pre-school age, no specific grade
        '5-6': [1], // Grade 1: Year 5-6
        '6-7': [2], // Grade 2: Year 6-7
        '7-8': [3], // Grade 3: Year 7-8
        '8-9': [4], // Grade 4: Year 8-9
        '9-10': [5], // Grade 5: Year 9-10
        '10-11': [6], // Grade 6: Year 10-11
        '11-12': [7], // Grade 7: Year 11-12
        '12-13': [8], // Grade 8: Year 12-13
        '13-14': [9], // Grade 9: Year 13-14
        '14-15': [10], // Grade 10: Year 14-15
        '15-16': [11], // Grade 11: Year 15-16
        '16-17': [12], // Grade 12: Year 16-17
        '17-18': [13] // Grade 13: Year 17-18 (extended range)
      };
      
      if (ageToGrades[filters.ageGroup]) {
        const gradesForAge = ageToGrades[filters.ageGroup];
        if (gradesForAge.length > 0) {
          filtered = filtered.filter(item => gradesForAge.includes(item.grade));
        } else {
          // For age groups with no grade mapping (like 4-5), show no results
          filtered = [];
        }
      }
    }

    // Filter by code (exact match)
    if (filters.code) {
      filtered = filtered.map(grade => {
        const filteredObjectives = grade.objectives?.filter(obj => 
          obj.code && obj.code === filters.code
        ) || [];
        
        return {
          ...grade,
          objectives: filteredObjectives
        };
      }).filter(grade => grade.objectives && grade.objectives.length > 0);
    }

    // Filter by subject (matches subject name - to be implemented when subject data is available)
    if (filters.subject) {
      // For now, subject filtering can be added when subject field exists in data
      // This is a placeholder for future implementation
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
  }, [filters, data]);

  const toggleCourseDetails = (gradeId, courseIndex) => {
    if (isSelectionMode) {
      // In selection mode, toggle topic selection instead of expanding
      const topicKey = `${gradeId}-${courseIndex}`;
      setSelectedTopics(prev => {
        if (prev.includes(topicKey)) {
          return prev.filter(key => key !== topicKey);
        } else {
          return [...prev, topicKey];
        }
      });
    } else {
      // Normal mode: expand/collapse
      const key = `${gradeId}-${courseIndex}`;
      setExpandedCourse(expandedCourse === key ? null : key);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
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

  const objKey = (grade, code) => `${grade}::${(code != null ? String(code) : '').trim()}`;
  const parseObjKey = (key) => {
    const i = key.indexOf('::');
    if (i === -1) return { grade: parseInt(key, 10), code: '' };
    return { grade: parseInt(key.slice(0, i), 10), code: key.slice(i + 2) };
  };

  const handleDeleteObjective = async (grade, topic) => {
    const key = objKey(grade.grade, topic.code);
    const label = topic.title || topic.code || 'this objective';
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return;
    try {
      setDeletingObjectiveKey(key);
      await axios.delete(`${API_URL}/api/curriculum/objective`, {
        data: { grade: grade.grade, code: topic.code || '' },
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

  const toggleObjectiveSelection = (gradeNum, code) => {
    const key = objKey(gradeNum, code);
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
      objectives.forEach((obj) => next.add(objKey(gradeNum, obj.code)));
      if (!checked) objectives.forEach((obj) => next.delete(objKey(gradeNum, obj.code)));
      return next;
    });
  };

  const handleDeleteSelectedObjectives = async () => {
    const items = Array.from(selectedObjectives).map((key) => parseObjKey(key));
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

  const handleEditObjectiveClick = (gradeNum, obj) => {
    setEditingObjectiveKey(objKey(gradeNum, obj.code));
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

  const handleSaveObjective = async (gradeNum, code) => {
    const key = objKey(gradeNum, code);
    try {
      setSavingObjectiveKey(key);
      await axios.put(`${API_URL}/api/curriculum/objective`, {
        grade: gradeNum,
        code: (code != null ? String(code) : '').trim(),
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
    setExpandedCourse(null); // Close any expanded cards
  };

  // Handle students data button click
  const handleStudentsDataClick = () => {
    setCurrentView('studentsData');
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

  // Handle Next button click
  const handleNextClick = () => {
    if (selectedTopics.length > 0) {
      setShowForm(true);
      setIsSelectionMode(false);
    }
  };

  // Handle cancel selection mode
  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedTopics([]);
  };

  // Handle form field changes
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle duration type change
  const handleDurationTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      durationType: prev.durationType === type ? '' : type,
      durationValue: prev.durationType === type ? '' : prev.durationValue
    }));
  };

  // Handle weightage checkbox change
  const handleWeightageCheckboxChange = (id, checked) => {
    setFormData(prev => ({
      ...prev,
      weightageItems: prev.weightageItems.map(item =>
        item.id === id ? { ...item, checked } : item
      )
    }));
  };

  // Handle weightage percentage change
  const handleWeightagePercentageChange = (id, percentage) => {
    setFormData(prev => ({
      ...prev,
      weightageItems: prev.weightageItems.map(item =>
        item.id === id ? { ...item, percentage } : item
      )
    }));
  };

  // Add new weightage item
  const handleAddWeightageItem = () => {
    const newLabel = prompt('Enter label for new weightage item:');
    if (newLabel && newLabel.trim()) {
      const newId = Math.max(...formData.weightageItems.map(item => item.id), 0) + 1;
      setFormData(prev => ({
        ...prev,
        weightageItems: [
          ...prev.weightageItems,
          { id: newId, label: newLabel.trim(), checked: false, percentage: '' }
        ]
      }));
    }
  };

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validate course name
    if (!formData.courseName || !formData.courseName.trim()) {
      alert('Error: Course name required');
      return;
    }

    // Validate duration
    if (!formData.durationType || !formData.durationValue) {
      alert('Error: Duration required');
      return;
    }

    // Validate weightage - at least one checked item
    const checkedWeightage = formData.weightageItems.filter(item => item.checked);
    if (checkedWeightage.length === 0) {
      alert('Error: Weightage required');
      return;
    }

    // Validate weightage percentages
    const totalWeightage = checkedWeightage.reduce((sum, item) => {
      const percentage = Number(item.percentage) || 0;
      return sum + percentage;
    }, 0);

    if (Math.abs(totalWeightage - 100) > 0.01) {
      alert('Error: Weightage must total 100%');
      return;
    }

    // Validate start date
    if (!formData.startDate) {
      alert('Error: Start date required');
      return;
    }

    // Map selectedTopics to actual topic data
    const topics = selectedTopics.map(topicKey => {
      const [gradeId, topicIndex] = topicKey.split('-');
      const grade = data.find(g => g._id === gradeId);
      if (grade && grade.objectives && grade.objectives[parseInt(topicIndex)]) {
        const topic = grade.objectives[parseInt(topicIndex)];
        return {
          courseCode: topic.code || '',
          topicName: topic.title || '',
        };
      }
      return null;
    }).filter(topic => topic !== null);

    if (topics.length === 0) {
      alert('Error: Topics required');
      return;
    }

    // Prepare data for API
    const courseData = {
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
      topics: topics,
    };

    try {
      const response = await axios.post(`${API_URL}/api/courses`, courseData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        alert('Success: Course created successfully');
        // Reset form
        setShowForm(false);
        setSelectedTopics([]);
        setFormData({
          courseName: '',
          durationType: '',
          durationValue: '',
          weightageItems: [
            { id: 1, label: 'assignment', checked: false, percentage: '' },
            { id: 2, label: 'paper', checked: false, percentage: '' },
            { id: 3, label: 'quiz', checked: false, percentage: '' },
            { id: 4, label: 'presentation', checked: false, percentage: '' }
          ],
          startDate: ''
        });
      } else {
        alert(`Error: ${response.data.message || 'Failed to create course'}`);
      }
    } catch (error) {
      console.error('Error creating course:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to create course';
      // Extract first 4-5 words for alert
      const shortMessage = errorMessage.split(' ').slice(0, 5).join(' ');
      alert(`Error: ${shortMessage}`);
    }
  };

  // Close form modal
  const handleCloseForm = () => {
    setShowForm(false);
    setSelectedTopics([]);
    setFormData({
      courseName: '',
      durationType: '',
      durationValue: '',
      weightageItems: [
        { id: 1, label: 'assignment', checked: false, percentage: '' },
        { id: 2, label: 'paper', checked: false, percentage: '' },
        { id: 3, label: 'quiz', checked: false, percentage: '' },
        { id: 4, label: 'presentation', checked: false, percentage: '' }
      ],
      startDate: ''
    });
  };

  // Extract unique filter options from data
  const getFilterOptions = () => {
    const codes = new Set();
    const topics = new Set();
    const learningObjectives = new Set();

    data.forEach(grade => {
      if (grade.objectives && Array.isArray(grade.objectives)) {
        grade.objectives.forEach(obj => {
          // Extract all unique codes
          if (obj.code) {
            codes.add(obj.code);
          }
          
          // Topic is the objective title
          if (obj.title) {
            topics.add(obj.title);
          }
          
          // Learning objective keywords from description
          if (obj.description) {
            // Extract key phrases or use full description
            const descWords = obj.description.toLowerCase().split(/\s+/);
            descWords.forEach(word => {
              if (word.length > 4) { // Only meaningful words
                learningObjectives.add(word);
              }
            });
          }
        });
      }
    });

    // Actual subjects list (sorted A-Z)
    const subjects = [
      'chemistry',
      'computer',
      'english',
      'islamiat',
      'math',
      'nazra',
      'pakistan studies',
      'physics',
      'robotics',
      'science',
      'social studies',
      'tarjuma tul quran',
      'urdu'
    ];

    return {
      codes: Array.from(codes).sort(),
      subjects: subjects,
      topics: Array.from(topics).sort(),
      learningObjectives: Array.from(learningObjectives).slice(0, 50).sort() // Limit to avoid too many options
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

  // If viewing students data, show StudentData component
  if (currentView === 'studentsData') {
    return (
      <div className="curriculum-container">
        <CurriculumHeader />
        <StudentData />
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
      {!loading && !isSelectionMode && data.length > 0 && !(filters.subject && filters.subject !== '' && filters.subject.toLowerCase() !== 'math' && filters.subject.toLowerCase() !== 'mathematics') && (
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

      {/* Check if subject is selected and not "All Subjects" or "Mathematics" */}
      {filters.subject && filters.subject !== '' && filters.subject.toLowerCase() !== 'math' && filters.subject.toLowerCase() !== 'mathematics' ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h2>No data uploaded yet</h2>
          <p>Curriculum data for this subject is not available at the moment.</p>
          <p className="empty-hint" style={{marginTop: '1rem'}}>
            Please select "All Subjects" or "Mathematics" to view available courses.
          </p>
          <button 
            onClick={() => setFilters({
              ...filters,
              subject: ''
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
            View All Subjects
          </button>
        </div>
      ) : filteredData.length === 0 && !loading ? (
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
          {filteredData.map((grade) => (
            <div key={grade._id || grade.grade} className="grade-section">
              <div className="grade-heading-wrapper">
                <h2 className="grade-main-heading">Grade {grade.grade}</h2>
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
                              checked={grade.objectives.length > 0 && grade.objectives.every((obj) => selectedObjectives.has(objKey(grade.grade, obj.code)))}
                              onChange={(e) => handleSelectAllInGrade(grade.grade, grade.objectives, e.target.checked)}
                            />
                          </th>
                        )}
                        {isSelectionMode && (
                          <th className="objectives-th-checkbox">Add to course</th>
                        )}
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
                        const key = objKey(grade.grade, topic.code);
                        const topicKey = `${grade._id}-${topicIndex}`;
                        const isSelectedForCourse = selectedTopics.includes(topicKey);
                        const isEditing = editingObjectiveKey === key;
                        const isSaving = savingObjectiveKey === key;
                        const isDeleting = deletingObjectiveKey === key;
                        return (
                          <tr key={topic.code || topicIndex} className={isEditing ? 'objectives-row-editing' : ''}>
                            {objectivesSelectMode && (
                              <td className="objectives-td-checkbox">
                                <input
                                  type="checkbox"
                                  aria-label={`Select ${topic.code}`}
                                  checked={selectedObjectives.has(key)}
                                  onChange={() => toggleObjectiveSelection(grade.grade, topic.code)}
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
                                    onClick={() => handleSaveObjective(grade.grade, topic.code)}
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
                                    onClick={() => handleEditObjectiveClick(grade.grade, topic)}
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
                                    onClick={() => handleDeleteObjective(grade, topic)}
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

      {/* Course Creation Form Modal */}
      {showForm && (
        <div className="form-modal-overlay" onClick={handleCloseForm}>
          <div className="form-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="form-modal-header">
              <h2>Create Course</h2>
              <button className="close-modal-button" onClick={handleCloseForm}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="course-form">
              {/* Course Name */}
              <div className="form-field">
                <label htmlFor="course-name" className="form-label">Course Name</label>
                <input
                  type="text"
                  id="course-name"
                  className="course-name-input"
                  placeholder="Enter course name"
                  value={formData.courseName}
                  onChange={(e) => handleFormChange('courseName', e.target.value)}
                  required
                />
              </div>

              {/* Course Duration */}
              <div className="form-field">
                <label className="form-label">Course Duration</label>
                <div className="duration-options">
                  <label className="duration-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.durationType === 'days'}
                      onChange={() => handleDurationTypeChange('days')}
                    />
                    <span>Days</span>
                  </label>
                  <label className="duration-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.durationType === 'weeks'}
                      onChange={() => handleDurationTypeChange('weeks')}
                    />
                    <span>Weeks</span>
                  </label>
                  <label className="duration-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.durationType === 'months'}
                      onChange={() => handleDurationTypeChange('months')}
                    />
                    <span>Months</span>
                  </label>
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
                      required
                    />
                    <span className="duration-unit">{formData.durationType}</span>
                  </div>
                )}
              </div>

              {/* Weightage */}
              <div className="form-field">
                <label className="form-label">Weightage</label>
                <div className="weightage-items">
                  {formData.weightageItems.map((item) => (
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
                            required={item.checked}
                          />
                          <span className="percentage-symbol">%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="add-weightage-button"
                  onClick={handleAddWeightageItem}
                >
                  + Add
                </button>
              </div>

              {/* Starting Date */}
              <div className="form-field">
                <label htmlFor="start-date" className="form-label">Starting Date</label>
                <input
                  type="date"
                  id="start-date"
                  className="date-input"
                  value={formData.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                  required
                />
              </div>

              {/* Form Actions */}
              <div className="form-actions">
                <button type="button" className="cancel-form-button" onClick={handleCloseForm}>
                  Cancel
                </button>
                <button type="submit" className="create-form-button">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Curriculum;
