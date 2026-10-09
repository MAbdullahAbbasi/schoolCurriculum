import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from './config/api';
import BrandMark from './publicSite/BrandMark';
import { HOME_HERO_SLIDES } from './publicSite/data/heroSlides';
import './Login.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AccessRequest() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [slideIndex] = useState(0);
  const [imgFailed, setImgFailed] = useState(false);

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

  const slide = HOME_HERO_SLIDES[slideIndex];

  return (
    <div className="tl-login">
      <div className="tl-login__bg" aria-hidden="true">
        <div className={`tl-login__slide is-active${imgFailed ? ' is-fallback' : ''}`}>
          {!imgFailed && (
            <img
              src={slide.src}
              alt=""
              loading="eager"
              onError={() => setImgFailed(true)}
            />
          )}
        </div>
        <div className="tl-login__overlay" />
      </div>

      <div className="tl-login__frame">
        <Link to="/login" className="tl-login__back">
          ← Back to sign in
        </Link>

        <div className="tl-login__panel">
          <header className="tl-login__header">
            <BrandMark size={48} />
            <p className="tl-login__eyebrow">Request access</p>
            <h1 className="tl-login__title">Contact administration</h1>
            <p className="tl-login__lead">
              Enter your registered email. We will notify the school administrator
              that you are requesting access to The Learning Grove.
            </p>
          </header>

          <form onSubmit={handleSubmit} className="tl-login__form" noValidate>
            <div className="tl-login__field">
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
              <p className="tl-login__error" role="alert">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="tl-login__info" role="status">
                {success}
              </p>
            ) : null}

            <button type="submit" className="tl-login__submit" disabled={loading}>
              <span className="tl-login__submit-inner">
                {loading ? 'Sending…' : 'Send access request'}
              </span>
            </button>
          </form>

          <p className="tl-login__note">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
