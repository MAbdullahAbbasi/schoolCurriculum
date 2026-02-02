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

  // Fetch data from API
  useEffect(() => {
    axios.get(`${API_URL}/api/curriculum`, {
      timeout: 10000, // 10 second timeout
    })
      .then(res => {
        console.log('Data received:', res.data);
        setData(res.data);
        setFilteredData(res.data); // Initialize filtered data with all data
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching data:', err);
        if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
          console.error('Backend server is not running or not accessible');
          console.error(`Please ensure the backend server is running on ${API_URL}`);
        } else if (err.response) {
          console.error('Error response:', err.response.status, err.response.data);
          if (err.response.status === 503 && err.response.data?.error === 'Database not connected') {
            console.error('MongoDB is not connected. Please check IP whitelist in MongoDB Atlas.');
          }
        } else {
          console.error('Error details:', err.message);
        }
        setLoading(false);
      });
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

  // Handle back to curriculum view
  const handleBackToCurriculum = () => {
    setCurrentView('curriculum');
  };

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
        <CurriculumHeader 
          onCreateCourseClick={handleCreateCourseClick}
          onStudentsDataClick={handleStudentsDataClick}
        />
        <StudentData />
      </div>
    );
  }

  return (
    <div className="curriculum-container">
      <CurriculumHeader 
        onCreateCourseClick={handleCreateCourseClick}
        onStudentsDataClick={handleStudentsDataClick}
      />
      
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
          {filteredData.map((grade) => (
            <div key={grade._id} className="grade-section">
              <div className="grade-heading-wrapper">
                <h2 className="grade-main-heading">Grade {grade.grade}</h2>
                <div className="grade-divider-line"></div>
              </div>
              
              {grade.objectives && grade.objectives.length > 0 ? (
                <div className="topics-grid">
                  {grade.objectives.map((topic, topicIndex) => {
                    const topicKey = `${grade._id}-${topicIndex}`;
                    const isExpanded = expandedCourse === topicKey;
                    const isSelected = selectedTopics.includes(topicKey);
                    
                    return (
                      <div 
                        key={topic.code || topicIndex} 
                        className={`topic-card ${isExpanded ? 'expanded' : ''} ${isSelectionMode ? 'selection-mode' : ''} ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleCourseDetails(grade._id, topicIndex)}
                        onMouseEnter={(e) => !isSelectionMode && e.currentTarget.classList.add('hovered')}
                        onMouseLeave={(e) => e.currentTarget.classList.remove('hovered')}
                      >
                        {isSelectionMode && (
                          <div className="selection-checkbox" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleTopicSelect(grade._id, topicIndex);
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div className="topic-card-header">
                          <div className="topic-code-badge">{topic.code}</div>
                          <h3 className="topic-title">{topic.title}</h3>
                          {!isSelectionMode && (
                            <div className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </div>
                        
                        {!isSelectionMode && (
                          <div className={`topic-details ${isExpanded ? 'show' : ''}`}>
                            <div className="topic-description">
                              <p>{topic.description}</p>
                            </div>
                            
                            {topic.details && (
                              <div className="topic-additional-info">
                                <h4>Additional Information:</h4>
                                <ul>
                                  {Array.isArray(topic.details) ? (
                                    topic.details.map((detail, idx) => (
                                      <li key={idx}>{detail}</li>
                                    ))
                                  ) : (
                                    <li>{topic.details}</li>
                                  )}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="no-topics">
                  <p>No topics available for this grade.</p>
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
