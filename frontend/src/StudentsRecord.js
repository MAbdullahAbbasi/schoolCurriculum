import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CurriculumHeader from './CurriculumHeader';
import { API_URL } from './config/api';
import { IconAdd, IconCancel, IconClose, IconDelete, IconEdit, IconRemove, IconSave, IconSelectAll } from './ButtonIcons';
import './StudentsRecord.css';

const normalizeDateForInput = (d) => {
  if (!d) return '';
  // backend already returns YYYY-MM-DD for startingDate, but keep this safe
  const s = String(d).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dd = new Date(s);
  if (Number.isNaN(dd.getTime())) return '';
  return dd.toISOString().split('T')[0];
};

const StudentsRecord = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingCourseCode, setDeletingCourseCode] = useState(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [courseNameSearch, setCourseNameSearch] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCourseCodes, setSelectedCourseCodes] = useState(new Set());
  const [deletingSelected, setDeletingSelected] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const sortedCourses = useMemo(() => {
    const arr = [...courses];
    arr.sort((a, b) => {
      const da = new Date(a?.createdAt || a?.updatedAt || 0).getTime();
      const db = new Date(b?.createdAt || b?.updatedAt || 0).getTime();
      return db - da;
    });
    return arr;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    if (!courseNameSearch.trim()) return sortedCourses;
    const q = courseNameSearch.trim().toLowerCase();
    return sortedCourses.filter((c) => (c.courseName || '').toLowerCase().includes(q));
  }, [sortedCourses, courseNameSearch]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/api/courses`);
      if (response.data.success) {
        setCourses(response.data.data || []);
      } else {
        setError('Failed to fetch courses');
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('Failed to fetch courses. Please try again later.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseCode) => {
    navigate(`/studentRecord/${courseCode}`);
  };

  const openEdit = (e, course) => {
    e.stopPropagation();
    setError(null);
    setEditingCourse(course);
    setEditForm({
      courseName: course.courseName || '',
      courseDurationType: course.courseDuration?.type || 'weeks',
      courseDurationValue: course.courseDuration?.value ?? '',
      startingDate: normalizeDateForInput(course.startingDate),
      topics: Array.isArray(course.topics) ? course.topics.map((t) => ({
        courseCode: t.courseCode || '',
        topicName: t.topicName || '',
        marks: t.marks ?? 0,
        grade: t.grade ?? null,
      })) : [],
      weightage: Array.isArray(course.weightage) ? course.weightage.map((w) => ({
        label: w.label || '',
        percentage: w.percentage ?? 0,
      })) : [],
    });
  };

  const closeEdit = () => {
    setEditingCourse(null);
    setEditForm(null);
    setSavingEdit(false);
  };

  const updateEditField = (field, value) => {
    setEditForm((prev) => ({ ...(prev || {}), [field]: value }));
  };

  const updateWeightageItem = (idx, field, value) => {
    setEditForm((prev) => {
      const next = { ...(prev || {}) };
      const items = [...(next.weightage || [])];
      if (!items[idx]) return prev;
      items[idx] = { ...items[idx], [field]: value };
      next.weightage = items;
      return next;
    });
  };

  const addWeightageItem = () => {
    setEditForm((prev) => ({
      ...(prev || {}),
      weightage: [...((prev && prev.weightage) || []), { label: '', percentage: 0 }],
    }));
  };

  const removeWeightageItem = (idx) => {
    setEditForm((prev) => {
      const next = { ...(prev || {}) };
      next.weightage = (next.weightage || []).filter((_, i) => i !== idx);
      return next;
    });
  };

  const updateTopicItem = (idx, field, value) => {
    setEditForm((prev) => {
      const next = { ...(prev || {}) };
      const items = [...(next.topics || [])];
      if (!items[idx]) return prev;
      items[idx] = { ...items[idx], [field]: value };
      next.topics = items;
      return next;
    });
  };

  const addTopicItem = () => {
    setEditForm((prev) => ({
      ...(prev || {}),
      topics: [...((prev && prev.topics) || []), { courseCode: '', topicName: '', marks: 0, grade: null }],
    }));
  };

  const removeTopicItem = (idx) => {
    setEditForm((prev) => {
      const next = { ...(prev || {}) };
      next.topics = (next.topics || []).filter((_, i) => i !== idx);
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editingCourse || !editForm) return;
    const code = editingCourse.code;
    if (!editForm.courseName.trim()) {
      setError('Course name is required');
      return;
    }
    if (!editForm.courseDurationType || !editForm.courseDurationValue) {
      setError('Duration is required');
      return;
    }
    if (!editForm.startingDate) {
      setError('Starting date is required');
      return;
    }
    if (!Array.isArray(editForm.topics) || editForm.topics.length === 0) {
      setError('At least one topic is required');
      return;
    }
    if (!Array.isArray(editForm.weightage) || editForm.weightage.length === 0) {
      setError('At least one weightage item is required');
      return;
    }
    const weightageTotal = editForm.weightage.reduce((s, w) => s + (Number(w.percentage) || 0), 0);
    if (Math.abs(weightageTotal - 100) > 0.01) {
      setError('Weightage must total 100%');
      return;
    }

    const payload = {
      courseName: editForm.courseName.trim(),
      courseDuration: { type: editForm.courseDurationType, value: Number(editForm.courseDurationValue) },
      startingDate: editForm.startingDate,
      topics: editForm.topics.map((t) => ({
        courseCode: String(t.courseCode || '').trim(),
        topicName: String(t.topicName || '').trim(),
        marks: Number(t.marks) || 0,
        grade: t.grade != null && t.grade !== '' ? Number(t.grade) : null,
      })),
      weightage: editForm.weightage.map((w) => ({
        label: String(w.label || '').trim(),
        percentage: Number(w.percentage) || 0,
      })),
    };

    try {
      setSavingEdit(true);
      setError(null);
      await axios.put(`${API_URL}/api/courses/${encodeURIComponent(code)}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });
      await fetchCourses();
      closeEdit();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to update course.';
      setError(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteCourse = async (e, courseCode, courseName) => {
    e.stopPropagation();
    if (!window.confirm(`Delete course "${courseName || courseCode}"? This will also remove its student record. This cannot be undone.`)) return;
    try {
      setDeletingCourseCode(courseCode);
      setError(null);
      await axios.delete(`${API_URL}/api/courses/${encodeURIComponent(courseCode)}`);
      await fetchCourses();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete course.';
      setError(msg);
    } finally {
      setDeletingCourseCode(null);
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete ALL courses and their records? This cannot be undone.')) return;
    try {
      setDeletingAll(true);
      setError(null);
      await axios.delete(`${API_URL}/api/courses`);
      await fetchCourses();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete courses.';
      setError(msg);
    } finally {
      setDeletingAll(false);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
    if (selectionMode) setSelectedCourseCodes(new Set());
  };

  const toggleCourseSelection = (e, courseCode) => {
    e.stopPropagation();
    setSelectedCourseCodes((prev) => {
      const next = new Set(prev);
      if (next.has(courseCode)) next.delete(courseCode);
      else next.add(courseCode);
      return next;
    });
  };

  const handleSelectAllCourses = (e) => {
    e.stopPropagation();
    const checked = e.target.checked;
    setSelectedCourseCodes(checked ? new Set(filteredCourses.map((c) => c.code).filter(Boolean)) : new Set());
  };

  const handleDeleteSelected = async () => {
    const codes = Array.from(selectedCourseCodes);
    if (codes.length === 0) return;
    if (!window.confirm(`Delete ${codes.length} selected course(s) and their records? This cannot be undone.`)) return;
    try {
      setDeletingSelected(true);
      setError(null);
      for (const code of codes) {
        await axios.delete(`${API_URL}/api/courses/${encodeURIComponent(code)}`);
      }
      await fetchCourses();
      setSelectedCourseCodes(new Set());
      setSelectionMode(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to delete selected courses.';
      setError(msg);
    } finally {
      setDeletingSelected(false);
    }
  };

  if (loading) {
    return (
      <div className="students-record-container">
        <CurriculumHeader />
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="students-record-container">
      <CurriculumHeader />
      <div className="students-record-content">
        <h2>Courses Record</h2>
        <p>Select a course to view and manage student records</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {sortedCourses.length > 0 ? (
          <>
            <div className="courses-record-search-row">
              <label htmlFor="course-name-search" className="courses-record-search-label">
                Search by course name
              </label>
              <input
                id="course-name-search"
                type="search"
                className="courses-record-search-input"
                placeholder="Type to filter by course name..."
                value={courseNameSearch}
                onChange={(e) => setCourseNameSearch(e.target.value)}
                aria-label="Search courses by name"
              />
              {courseNameSearch.trim() && (
                <span className="courses-record-search-hint">
                  Showing {filteredCourses.length} of {sortedCourses.length} course{sortedCourses.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="courses-record-actions">
              <button
                type="button"
                className={`courses-record-select-btn ${selectionMode ? 'active' : ''}`}
                onClick={toggleSelectionMode}
                disabled={deletingAll || deletingSelected}
              >
                <span className="btn-icon-wrap"><IconSelectAll />{selectionMode ? 'Cancel' : 'Select'}</span>
              </button>
              {selectionMode && (
                <button
                  type="button"
                  className="courses-record-delete-selected-btn"
                  onClick={handleDeleteSelected}
                  disabled={selectedCourseCodes.size === 0 || deletingSelected}
                >
                  <span className="btn-icon-wrap"><IconDelete />{deletingSelected ? 'Deleting...' : `Delete selected (${selectedCourseCodes.size})`}</span>
                </button>
              )}
              <button
                type="button"
                className="delete-all-courses-btn"
                onClick={handleDeleteAll}
                disabled={deletingAll || deletingSelected || selectionMode}
              >
                <span className="btn-icon-wrap"><IconDelete />{deletingAll ? 'Deleting...' : 'Delete all'}</span>
              </button>
            </div>
            <div className="courses-table-wrapper">
              <table className="courses-record-table">
<thead>
                <tr>
                  {selectionMode && (
                    <th className="courses-record-th-checkbox">
                      <span className="courses-record-select-col-label">Select</span>
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={filteredCourses.length > 0 && filteredCourses.every((c) => selectedCourseCodes.has(c.code))}
                        onChange={handleSelectAllCourses}
                      />
                    </th>
                  )}
                  <th>Sr. No</th>
                  <th>Course Code</th>
                    <th>Course Name</th>
                    <th>Duration</th>
                    <th>Start Date</th>
                    <th>Topics</th>
                    <th>Weightage</th>
                    <th className="courses-table-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.length === 0 && courseNameSearch.trim() ? (
                    <tr>
                      <td colSpan={selectionMode ? 9 : 8} className="courses-record-empty-search">
                        No courses match &quot;{courseNameSearch.trim()}&quot;. Try a different search.
                      </td>
                    </tr>
                  ) : (
                  filteredCourses.map((course, idx) => (
                    <tr
                      key={course._id || course.code}
                      className="courses-record-row"
                      onClick={() => !selectionMode && handleCourseClick(course.code)}
                    >
                      {selectionMode && (
                        <td className="courses-record-td-checkbox" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${course.courseName || course.code}`}
                            checked={selectedCourseCodes.has(course.code)}
                            onChange={(e) => toggleCourseSelection(e, course.code)}
                          />
                        </td>
                      )}
                      <td>{idx + 1}</td>
                      <td>{course.code || '-'}</td>
                      <td>{course.courseName || '-'}</td>
                      <td>
                        {course.courseDuration?.value != null && course.courseDuration?.type
                          ? `${course.courseDuration.value} ${course.courseDuration.type}`
                          : '-'}
                      </td>
                      <td>
                        {course.startingDate
                          ? new Date(course.startingDate).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td>{course.topics?.length ?? 0}</td>
                      <td>{course.weightage?.map((w) => w.label).join(', ') || 'N/A'}</td>
                      <td className="courses-table-td-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="course-row-edit-btn"
                          onClick={(e) => openEdit(e, course)}
                          title="Edit course"
                          aria-label="Edit course"
                        >
                          <span className="btn-icon-wrap"><IconEdit />Edit</span>
                        </button>
                        <button
                          type="button"
                          className="course-row-delete-btn"
                          onClick={(e) => handleDeleteCourse(e, course.code, course.courseName)}
                          disabled={deletingCourseCode === course.code}
                          title="Delete course"
                          aria-label="Delete course"
                        >
                          <span className="btn-icon-wrap"><IconDelete />{deletingCourseCode === course.code ? 'Deleting...' : 'Delete'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h2>No Courses Available</h2>
            <p>No courses found. Please create a course first.</p>
          </div>
        )}
      </div>

      {editingCourse && editForm && (
        <>
          <div className="course-edit-overlay" onClick={closeEdit} role="button" aria-label="Close edit" />
          <div className="course-edit-modal" role="dialog" aria-modal="true" aria-label="Edit course">
            <div className="course-edit-header">
              <h3 className="course-edit-title">Edit Course</h3>
              <button type="button" className="course-edit-close-btn" onClick={closeEdit} aria-label="Close">
                <span className="btn-icon-wrap"><IconClose />Close</span>
              </button>
            </div>

            <div className="course-edit-body">
              <div className="course-edit-grid">
                <div className="course-edit-field">
                  <label className="course-edit-label">Course Code (read-only)</label>
                  <input className="course-edit-input" value={editingCourse.code || ''} disabled />
                </div>
                <div className="course-edit-field">
                  <label className="course-edit-label">Course Name</label>
                  <input
                    className="course-edit-input"
                    value={editForm.courseName}
                    onChange={(e) => updateEditField('courseName', e.target.value)}
                  />
                </div>
                <div className="course-edit-field">
                  <label className="course-edit-label">Duration Type</label>
                  <select
                    className="course-edit-input"
                    value={editForm.courseDurationType}
                    onChange={(e) => updateEditField('courseDurationType', e.target.value)}
                  >
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                    <option value="months">months</option>
                  </select>
                </div>
                <div className="course-edit-field">
                  <label className="course-edit-label">Duration Value</label>
                  <input
                    type="number"
                    min="1"
                    className="course-edit-input"
                    value={editForm.courseDurationValue}
                    onChange={(e) => updateEditField('courseDurationValue', e.target.value)}
                  />
                </div>
                <div className="course-edit-field">
                  <label className="course-edit-label">Start Date</label>
                  <input
                    type="date"
                    className="course-edit-input"
                    value={editForm.startingDate}
                    onChange={(e) => updateEditField('startingDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="course-edit-section">
                <div className="course-edit-section-header">
                  <h4>Topics</h4>
                  <button type="button" className="course-edit-small-btn" onClick={addTopicItem}><span className="btn-icon-wrap"><IconAdd />+ Add</span></button>
                </div>
                <div className="course-edit-table-wrapper">
                  <table className="course-edit-table">
                    <thead>
                      <tr>
                        <th>Objective Code</th>
                        <th>Topic Name</th>
                        <th>Marks</th>
                        <th>Grade</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {editForm.topics.map((t, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              className="course-edit-input"
                              value={t.courseCode}
                              onChange={(e) => updateTopicItem(i, 'courseCode', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              className="course-edit-input"
                              value={t.topicName}
                              onChange={(e) => updateTopicItem(i, 'topicName', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="course-edit-input"
                              value={t.marks}
                              onChange={(e) => updateTopicItem(i, 'marks', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="course-edit-input"
                              value={t.grade ?? ''}
                              onChange={(e) => updateTopicItem(i, 'grade', e.target.value)}
                            />
                          </td>
                          <td>
                            <button type="button" className="course-edit-remove-btn" onClick={() => removeTopicItem(i)}>
                              <span className="btn-icon-wrap"><IconRemove />Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="course-edit-section">
                <div className="course-edit-section-header">
                  <h4>Weightage</h4>
                  <button type="button" className="course-edit-small-btn" onClick={addWeightageItem}><span className="btn-icon-wrap"><IconAdd />+ Add</span></button>
                </div>
                <div className="course-edit-table-wrapper">
                  <table className="course-edit-table">
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Percentage</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {editForm.weightage.map((w, i) => (
                        <tr key={i}>
                          <td>
                            <input
                              className="course-edit-input"
                              value={w.label}
                              onChange={(e) => updateWeightageItem(i, 'label', e.target.value)}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              className="course-edit-input"
                              value={w.percentage}
                              onChange={(e) => updateWeightageItem(i, 'percentage', e.target.value)}
                            />
                          </td>
                          <td>
                            <button type="button" className="course-edit-remove-btn" onClick={() => removeWeightageItem(i)}>
                              <span className="btn-icon-wrap"><IconRemove />Remove</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="course-edit-weightage-total">
                  Total: <strong>{editForm.weightage.reduce((s, w) => s + (Number(w.percentage) || 0), 0)}%</strong> (must be 100%)
                </p>
              </div>
            </div>

            <div className="course-edit-footer">
              <button type="button" className="course-edit-cancel-btn" onClick={closeEdit} disabled={savingEdit}>
                <span className="btn-icon-wrap"><IconCancel />Cancel</span>
              </button>
              <button type="button" className="course-edit-save-btn" onClick={saveEdit} disabled={savingEdit}>
                <span className="btn-icon-wrap"><IconSave />{savingEdit ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentsRecord;
