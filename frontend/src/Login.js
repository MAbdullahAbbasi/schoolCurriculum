import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconLogin, IconView, IconEyeOff } from './ButtonIcons';
import axios from 'axios';
import { API_URL } from './config/api';
import { APP_LABELS } from './roleLabels';
import BrandMark from './publicSite/BrandMark';
import { HOME_HERO_SLIDES } from './publicSite/data/heroSlides';
import './Login.css';

const INTERVAL_MS = 6500;

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reduceMotion.current) return undefined;
    const id = window.setInterval(() => {
      setSlideIndex((i) => (i + 1) % HOME_HERO_SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

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
    <div className="tl-login">
      <div className="tl-login__bg" aria-hidden="true">
        {HOME_HERO_SLIDES.map((slide, i) => {
          const broken = failed[i];
          return (
            <div
              key={slide.src}
              className={`tl-login__slide${i === slideIndex ? ' is-active' : ''}${
                broken ? ' is-fallback' : ''
              }`}
            >
              {!broken && (
                <img
                  src={slide.src}
                  alt=""
                  loading={i === 0 ? 'eager' : 'lazy'}
                  onError={() =>
                    setFailed((prev) => ({ ...prev, [i]: true }))
                  }
                />
              )}
            </div>
          );
        })}
        <div className="tl-login__overlay" />
      </div>

      <div className="tl-login__frame">
        <Link to="/" className="tl-login__back">
          ← Back to The Learning Grove
        </Link>

        <div className="tl-login__panel">
          <header className="tl-login__header">
            <BrandMark size={48} />
            <p className="tl-login__eyebrow">Welcome back</p>
            <h1 className="tl-login__title">{APP_LABELS.brandTitle}</h1>
            <p className="tl-login__lead">
              Sign in with your staff account or seedling registration number.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="tl-login__form" noValidate>
            <div className="tl-login__field">
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

            <div className="tl-login__field">
              <label htmlFor="login-password">Password</label>
              <div className="tl-login__password">
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
                  className="tl-login__toggle"
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
              <p className="tl-login__error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="tl-login__submit" disabled={loading}>
              <span className="tl-login__submit-inner">
                <IconLogin />
                {loading ? 'Signing in…' : 'Sign in'}
              </span>
            </button>
          </form>

          <p className="tl-login__note">
            Need an account? Ask your school administrator for access.
          </p>
        </div>

        <div className="tl-login__dots" role="tablist" aria-label="Background slides">
          {HOME_HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={i === slideIndex}
              aria-label={`Show background ${i + 1}`}
              className={`tl-login__dot${i === slideIndex ? ' is-active' : ''}`}
              onClick={() => setSlideIndex(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Login;
