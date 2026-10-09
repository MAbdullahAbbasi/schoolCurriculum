import React, { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import BrandMark from './BrandMark';

const NAV_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/academics', label: 'Academics' },
  { to: '/features', label: 'Features' },
  { to: '/articles', label: 'Articles' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const menuId = useId();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="ps-nav">
      <div className="ps-nav__inner">
        <Link to="/" className="ps-nav__brand" aria-label="The Learning Grove home">
          <BrandMark size={38} />
          <span className="ps-nav__brand-text">The Learning Grove</span>
        </Link>

        <nav className="ps-nav__desktop" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `ps-nav__link${isActive ? ' is-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="ps-nav__actions">
          <Link to="/login" className="ps-btn ps-btn--ghost ps-btn--sm">
            Login
          </Link>
          <Link to="/login" className="ps-btn ps-btn--primary ps-btn--sm">
            Get Started
          </Link>
          <button
            type="button"
            className="ps-nav__toggle"
            aria-expanded={open}
            aria-controls={menuId}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
          >
            <span className={open ? 'is-open' : ''} />
          </button>
        </div>
      </div>

      <div
        id={menuId}
        className={`ps-nav__mobile${open ? ' is-open' : ''}`}
        hidden={!open}
      >
        <nav aria-label="Mobile">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `ps-nav__mobile-link${isActive ? ' is-active' : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <div className="ps-nav__mobile-actions">
            <Link to="/login" className="ps-btn ps-btn--ghost">
              Login
            </Link>
            <Link to="/login" className="ps-btn ps-btn--primary">
              Get Started
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
