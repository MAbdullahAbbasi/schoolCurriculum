import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import BrandMark from './publicSite/BrandMark';
import './Login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccessRequest() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const value = email.trim().toLowerCase();
    if (!value || !EMAIL_RE.test(value)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/access-requests`, { email: value });
      if (res.data?.success) {
        setSuccess(
          res.data.message ||
            'Your request was sent. An administrator will be notified.'
        );
        setEmail('');
        return;
      }
      setError(res.data?.error || 'Could not send your request.');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Could not send your request. Please try again later.'
      );
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
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1400&q=80"
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
            <h2 className="login-aside__title">Request access with care.</h2>
            <p className="login-aside__lead">
              Share your registered email and we will notify the school
              administrator that you need an account.
            </p>
          </div>
        </aside>

        <main className="login-main">
          <Link to="/login" className="login-back">
            ← Back to sign in
          </Link>

          <div className="login-card">
            <div className="login-card__brand">
              <BrandMark size={42} />
              <div>
                <h1 className="login-title">Contact administration</h1>
                <p className="login-subtitle">
                  Enter your registered email to request access
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="login-form" noValidate>
              <div className="login-field">
                <label htmlFor="access-email">Registered email</label>
                <input
                  id="access-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              {error ? (
                <p className="login-error" role="alert">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p className="login-info" role="status">
                  {success}
                </p>
              ) : null}

              <button type="submit" className="login-submit" disabled={loading}>
                <span className="btn-icon-wrap">
                  {loading ? 'Sending…' : 'Send access request'}
                </span>
              </button>
            </form>

            <p className="login-footnote">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
