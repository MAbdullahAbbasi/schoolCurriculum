import React, { useMemo, useState } from 'react';
import { IconLogin } from './ButtonIcons';
import axios from 'axios';
import { API_URL } from './config/api';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const GRADES = useMemo(() => ['KG-II', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'], []);

  const [showSignup, setShowSignup] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [studentName, setStudentName] = useState('');
  const [fathersName, setFathersName] = useState('');
  const [signupGrade, setSignupGrade] = useState('KG-II');
  const [dob, setDob] = useState('');
  const [bioSubject, setBioSubject] = useState('Biology'); // for grades 8/9/10

  const showBioComputer = useMemo(() => {
    const g = String(signupGrade || '').trim().toLowerCase();
    return g === '8' || g === '9' || g === '10' || g === 'viii' || g === 'ix' || g === 'x';
  }, [signupGrade]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter User ID and Password.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        username: username.trim(),
        password,
      });
      if (res.data.success && res.data.token) {
        localStorage.setItem('curriculum_auth', JSON.stringify({
          username: res.data.user?.username || username,
          token: res.data.token,
        }));
        onLoginSuccess?.();
      } else {
        setError(res.data.error || 'Login failed.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">School Curriculum</h1>
        <p className="login-subtitle">Sign in to continue</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label htmlFor="login-userid">User ID</label>
            <input
              id="login-userid"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter user ID"
              autoComplete="username"
              disabled={loading}
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-submit" disabled={loading}>
            <span className="btn-icon-wrap"><IconLogin />{loading ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>

        <div className="login-signup-row">
          <button
            type="button"
            className="login-signup-link"
            onClick={() => {
              setSignupError('');
              setShowSignup((v) => !v);
            }}
          >
            {showSignup ? 'Close signup' : 'Sign up'}
          </button>
        </div>

        {showSignup && (
          <form
            className="signup-form"
            onSubmit={(e) => {
              e.preventDefault();
              setSignupError('');

              if (!studentName.trim() || !fathersName.trim() || !signupGrade || !dob) {
                setSignupError('Please fill all required fields.');
                return;
              }
              if (showBioComputer && !bioSubject) {
                setSignupError('Please select Biology or Computer.');
                return;
              }

              // Design-only: no backend call yet.
              // eslint-disable-next-line no-console
              console.log('Student signup payload (design only):', {
                studentName: studentName.trim(),
                fathersName: fathersName.trim(),
                grade: signupGrade,
                dateOfBirth: dob,
                subject: showBioComputer ? bioSubject : undefined,
              });
              alert('Signup form design only. No data saved yet.');
            }}
          >
            <h3 className="signup-title">Student Registration</h3>

            <div className="signup-grid">
              <label className="signup-field">
                Student Name
                <input
                  className="signup-input"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student name"
                />
              </label>

              <label className="signup-field">
                Father&apos;s Name
                <input
                  className="signup-input"
                  value={fathersName}
                  onChange={(e) => setFathersName(e.target.value)}
                  placeholder="Enter father name"
                />
              </label>

              <label className="signup-field">
                Grade
                <select className="signup-input" value={signupGrade} onChange={(e) => setSignupGrade(e.target.value)}>
                  {GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g === 'KG-II' ? 'KG-II' : g}
                    </option>
                  ))}
                </select>
              </label>

              <label className="signup-field">
                Date of Birth
                <input className="signup-input" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </label>
            </div>

            {showBioComputer && (
              <div className="signup-radio-block">
                <div className="signup-radio-label">Subject</div>
                <label className="signup-radio">
                  <input
                    type="radio"
                    name="bioSubject"
                    value="Biology"
                    checked={bioSubject === 'Biology'}
                    onChange={() => setBioSubject('Biology')}
                  />
                  Biology
                </label>
                <label className="signup-radio">
                  <input
                    type="radio"
                    name="bioSubject"
                    value="Computer"
                    checked={bioSubject === 'Computer'}
                    onChange={() => setBioSubject('Computer')}
                  />
                  Computer
                </label>
              </div>
            )}

            {signupError && <p className="signup-error">{signupError}</p>}

            <div className="signup-actions">
              <button type="button" className="btn-secondary" onClick={() => setShowSignup(false)}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Register
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
