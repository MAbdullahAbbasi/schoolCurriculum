import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from './config/api';
import { APP_LABELS, ROLE_LABELS } from './roleLabels';
import { formatGradeDisplay, isValidStudentPortalPassword } from './studentDataUtils';
import { IconSave, IconCancel } from './ButtonIcons';
import './StudentPortal.css';

const AUTH_KEY = 'curriculum_auth';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function durationLabel(duration) {
  if (!duration?.value || !duration?.type) return null;
  const n = duration.value;
  const t = duration.type;
  return `${n} ${t}${n === 1 ? '' : ''}`;
}

const StudentPortal = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [student, setStudent] = useState(null);
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const displayName = student?.studentName || 'Seedling';

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${API_URL}/api/student-portal/dashboard`);
      if (!res.data?.success) {
        setError(res.data?.message || 'Failed to load your portal.');
        return;
      }
      setStudent(res.data.student);
      setCourses(Array.isArray(res.data.courses) ? res.data.courses : []);
      setStats(res.data.stats || null);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to load your portal.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredCourses = useMemo(() => {
    if (activeFilter === 'marked') return courses.filter((c) => c.hasMarks);
    if (activeFilter === 'upcoming') return courses.filter((c) => !c.hasMarks);
    return courses;
  }, [courses, activeFilter]);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '/';
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMsg(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (!isValidStudentPortalPassword(newPassword)) {
      setPasswordError(
        'New password must be exactly 8 characters with uppercase, lowercase, a number, and a special character.'
      );
      return;
    }
    try {
      setSavingPassword(true);
      const res = await axios.post(`${API_URL}/api/student-portal/change-password`, {
        currentPassword,
        newPassword,
      });
      if (res.data?.success) {
        setPasswordMsg('Password updated. Your admin can see the new password in Seedlings.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordForm(false);
      } else {
        setPasswordError(res.data?.message || 'Could not update password.');
      }
    } catch (err) {
      setPasswordError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Could not update password.'
      );
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="sp-shell">
        <div className="sp-loading">
          <div className="sp-spinner" />
          <p>Opening your grove…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sp-shell">
        <div className="sp-error-panel">
          <h1>Couldn’t open your portal</h1>
          <p>{error}</p>
          <button type="button" className="sp-btn sp-btn-primary" onClick={loadDashboard}>
            Try again
          </button>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-shell">
      <div className="sp-bg-orb sp-bg-orb--1" aria-hidden="true" />
      <div className="sp-bg-orb sp-bg-orb--2" aria-hidden="true" />

      <header className="sp-topbar">
        <div className="sp-brand">
          <span className="sp-brand-mark" aria-hidden="true">
            ◆
          </span>
          <div>
            <div className="sp-brand-title">{APP_LABELS.brandTitle}</div>
            <div className="sp-brand-sub">{ROLE_LABELS.seedling} Portal</div>
          </div>
        </div>
        <div className="sp-topbar-actions">
          <button
            type="button"
            className="sp-btn sp-btn-soft"
            onClick={() => {
              setShowPasswordForm((v) => !v);
              setPasswordError(null);
              setPasswordMsg(null);
            }}
          >
            Change password
          </button>
          <button type="button" className="sp-btn sp-btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="sp-main">
        <section className="sp-hero">
          <div className="sp-hero-copy">
            <p className="sp-eyebrow">Welcome back</p>
            <h1 className="sp-hero-title">{displayName}</h1>
            <p className="sp-hero-meta">
              {formatGradeDisplay(student?.grade) || student?.grade || '—'}
              {student?.subject ? ` · ${student.subject}` : ''}
              {' · '}
              {student?.registrationNumber}
            </p>
            <p className="sp-hero-tagline">{APP_LABELS.brandTagline}</p>
          </div>
          <div className="sp-stat-grid">
            <div className="sp-stat-card" style={{ '--sp-delay': '0ms' }}>
              <div className="sp-stat-value">{stats?.courseCount ?? 0}</div>
              <div className="sp-stat-label">Your courses</div>
            </div>
            <div className="sp-stat-card" style={{ '--sp-delay': '80ms' }}>
              <div className="sp-stat-value">{stats?.markedCourseCount ?? 0}</div>
              <div className="sp-stat-label">With results</div>
            </div>
            <div className="sp-stat-card" style={{ '--sp-delay': '160ms' }}>
              <div className="sp-stat-value">
                {stats?.averagePercentage != null ? `${stats.averagePercentage}%` : '—'}
              </div>
              <div className="sp-stat-label">Average score</div>
            </div>
          </div>
        </section>

        {passwordMsg && (
          <div className="sp-banner sp-banner--ok" role="status">
            {passwordMsg}
          </div>
        )}

        {showPasswordForm && (
          <section className="sp-password-panel" aria-labelledby="sp-password-heading">
            <h2 id="sp-password-heading">Change your portal password</h2>
            <p className="sp-password-help">
              Use exactly 8 characters with uppercase, lowercase, a number, and a special character.
              After you save, the new password is stored so your school admin can see it in Seedlings.
            </p>
            <form className="sp-password-form" onSubmit={handleChangePassword}>
              <label>
                Current password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={savingPassword}
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={savingPassword}
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={savingPassword}
                />
              </label>
              {passwordError && <p className="sp-password-error">{passwordError}</p>}
              <div className="sp-password-actions">
                <button type="submit" className="sp-btn sp-btn-primary" disabled={savingPassword}>
                  <span className="btn-icon-wrap">
                    <IconSave />
                    {savingPassword ? 'Saving…' : 'Save password'}
                  </span>
                </button>
                <button
                  type="button"
                  className="sp-btn sp-btn-ghost"
                  disabled={savingPassword}
                  onClick={() => setShowPasswordForm(false)}
                >
                  <span className="btn-icon-wrap">
                    <IconCancel />
                    Cancel
                  </span>
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="sp-profile-strip" aria-label="Your profile">
          <div>
            <span className="sp-profile-label">Email</span>
            <span>{student?.email || 'Not set'}</span>
          </div>
          <div>
            <span className="sp-profile-label">Date of birth</span>
            <span>{formatDate(student?.dateOfBirth)}</span>
          </div>
          <div>
            <span className="sp-profile-label">Father&apos;s name</span>
            <span>{student?.fathersName || '—'}</span>
          </div>
        </section>

        <section className="sp-courses">
          <div className="sp-courses-head">
            <h2>Your courses</h2>
            <div className="sp-filters" role="tablist" aria-label="Filter courses">
              {[
                { id: 'all', label: 'All' },
                { id: 'marked', label: 'With results' },
                { id: 'upcoming', label: 'In progress' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === f.id}
                  className={`sp-filter ${activeFilter === f.id ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="sp-empty">
              <p>No courses in this view yet.</p>
              <p className="sp-empty-hint">
                When your school adds you to a course or publishes marks, they will appear here.
              </p>
            </div>
          ) : (
            <div className="sp-course-grid">
              {filteredCourses.map((course, index) => (
                <article
                  key={course.code}
                  className="sp-course-card"
                  style={{ '--sp-delay': `${index * 40}ms` }}
                >
                  <div className="sp-course-card-top">
                    <h3>{course.courseName}</h3>
                    {course.subject ? <span className="sp-chip">{course.subject}</span> : null}
                  </div>
                  <p className="sp-course-code">{course.code}</p>
                  <ul className="sp-course-meta">
                    {course.startingDate ? (
                      <li>Starts {formatDate(course.startingDate)}</li>
                    ) : null}
                    {durationLabel(course.courseDuration) ? (
                      <li>{durationLabel(course.courseDuration)}</li>
                    ) : null}
                    {course.topicCount > 0 ? <li>{course.topicCount} objectives</li> : null}
                  </ul>
                  <div className="sp-course-result">
                    {course.hasMarks ? (
                      <>
                        <div className="sp-score">
                          <span className="sp-score-pct">
                            {course.overallPercentage != null ? `${course.overallPercentage}%` : '—'}
                          </span>
                          <span className="sp-score-grade">{course.overallGrade || '—'}</span>
                        </div>
                        <span className={`sp-status ${course.marksLocked ? 'is-locked' : ''}`}>
                          {course.marksLocked ? 'Results saved' : 'Draft marks'}
                        </span>
                      </>
                    ) : (
                      <span className="sp-status is-pending">Awaiting results</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default StudentPortal;
