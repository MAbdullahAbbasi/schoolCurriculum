import React from 'react';
import { Link } from 'react-router-dom';
import BrandMark from './BrandMark';

const EXPLORE = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/academics', label: 'Academics' },
  { to: '/features', label: 'Features' },
  { to: '/articles', label: 'Articles' },
  { to: '/contact', label: 'Contact' },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="ps-footer">
      <div className="ps-container ps-footer__grid">
        <div className="ps-footer__brand">
          <div className="ps-footer__brand-row">
            <BrandMark size={40} />
            <strong>The Learning Grove</strong>
          </div>
          <p>
            A structured environment for curriculum, assessment, and student
            academic records—designed to support thoughtful educational
            management.
          </p>
        </div>

        <div>
          <h2 className="ps-footer__heading">Explore</h2>
          <ul className="ps-footer__list">
            {EXPLORE.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="ps-footer__heading">Account</h2>
          <ul className="ps-footer__list">
            <li>
              <Link to="/login">Login</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="ps-footer__bottom">
        <div className="ps-container">
          <p>© {year} The Learning Grove. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
