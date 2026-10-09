import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconLogin, IconView, IconEyeOff } from './ButtonIcons';
import axios from 'axios';
import { API_URL } from './config/api';
import { APP_LABELS } from './roleLabels';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Please enter User ID and Password.');
      return;
    }
    setLoading(true);
    const userId = username.trim();
    try {
      // Staff login first
      try {
        const res = await axios.post(`${API_URL}/api/auth/login`, {
          username: userId,
          password,
        });
        if (res.data.success && res.data.token) {
          localStorage.setItem('curriculum_auth', JSON.stringify({
            username: res.data.user?.username || userId,
            token: res.data.token,
            role: res.data.user?.role || null,
            portal: 'staff',
          }));
          onLoginSuccess?.();
          return;
        }
      } catch (staffErr) {
        // Fall through to student portal login
        if (staffErr.response?.status !== 401 && staffErr.response?.status !== 400) {
          throw staffErr;
        }
      }

      const studentRes = await axios.post(`${API_URL}/api/student-portal/login`, {
        username: userId,
        password,
      });
      if (studentRes.data.success && studentRes.data.token) {
        localStorage.setItem('curriculum_auth', JSON.stringify({
          username: studentRes.data.user?.username || userId,
          token: studentRes.data.token,
          role: 'STUDENT',
          portal: 'student',
          studentName: studentRes.data.student?.studentName || studentRes.data.user?.studentName || '',
        }));
        onLoginSuccess?.();
        return;
      }
      setError(studentRes.data.error || 'Login failed.');
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card login-card--forest">
        <div className="login-card-decoration" aria-hidden="true" />
        <h1 className="login-title">{APP_LABELS.brandTitle}</h1>
        <p className="login-subtitle">Staff or seedling registration number</p>
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
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                disabled={loading}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <IconEyeOff /> : <IconView />}
              </button>
            </div>
          </div>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="login-submit" disabled={loading}>
            <span className="btn-icon-wrap"><IconLogin />{loading ? 'Signing in...' : 'Sign in'}</span>
          </button>
        </form>
        <p className="login-home-link">
          <Link to="/">← Back to The Learning Grove</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
