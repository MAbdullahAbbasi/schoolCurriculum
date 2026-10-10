import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { IconLogin, IconView, IconEyeOff } from './ButtonIcons';
import axios from 'axios';
import { API_URL } from './config/api';
import { APP_LABELS } from './roleLabels';
import BrandMark from './publicSite/BrandMark';
import './Login.css';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setError('');
    setInfo('Google sign-in will be available soon.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!username.trim() || !password) {
      setError('Please enter User ID and Password.');
      return;
    }
    setLoading(true);
    const userId = username.trim();
    try {
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
      <div className="login-shell">
        <aside className="login-aside" aria-hidden="true">
          <div className="login-aside__media">
            <img
              src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=80"
              alt=""
              loading="eager"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('is-fallback');
              }}
            />
            <div className="login-aside__overlay" />
          </div>
          <div className="login-aside__content">
            <BrandMark size={48} />
            <p className="login-aside__eyebrow">The Learning Grove</p>
            <h2 className="login-aside__title">Growing Minds. Building Futures.</h2>
            <p className="login-aside__lead">
              Sign in to manage curriculum, assessments, student records, and
              academic reporting in one structured place.
            </p>
          </div>
        </aside>

        <main className="login-main">
          <Link to="/" className="login-back">
            ← Back to home
          </Link>

          <div className="login-card">
            <div className="login-card__brand">
              <BrandMark size={42} />
              <div>
                <h1 className="login-title">{APP_LABELS.brandTitle}</h1>
                <p className="login-subtitle">
                  Staff accounts or seedling registration numbers
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="login-field">
                <label htmlFor="login-userid">User ID</label>
                <input
                  id="login-userid"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your user ID"
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
                    placeholder="Enter your password"
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

              {error ? (
                <p className="login-error" role="alert">
                  {error}
                </p>
              ) : null}

              <button type="submit" className="login-submit" disabled={loading}>
                <span className="btn-icon-wrap">
                  <IconLogin />
                  {loading ? 'Signing in…' : 'Sign in'}
                </span>
              </button>
            </form>

            <div className="login-divider" role="separator" aria-label="or">
              <span>or</span>
            </div>

            <button
              type="button"
              className="login-google"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="login-google__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </button>

            {info ? (
              <p className="login-info" role="status">
                {info}
              </p>
            ) : null}

            <p className="login-footnote">
              Need access?{' '}
              <Link to="/request-access">Contact administration</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
