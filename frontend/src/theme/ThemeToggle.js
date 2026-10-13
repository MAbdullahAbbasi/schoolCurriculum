import React, { useEffect, useId, useRef, useState } from 'react';
import { useTheme } from './ThemeContext';
import './ThemeToggle.css';

const LABELS = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
};

const ICONS = {
  light: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <path
        fill="currentColor"
        d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  system: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="13" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 21h8M12 17v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M14.5 3.1A8.8 8.8 0 0 0 12 3a9 9 0 1 0 9 9c0-.7-.1-1.4-.3-2a7 7 0 0 1-6.2-6.9z"
      />
    </svg>
  ),
};

/**
 * Compact theme control: Light / System / Dark.
 * variant: "default" | "on-dark" | "compact"
 */
export default function ThemeToggle({ variant = 'default', className = '' }) {
  const { preference, setPreference, options } = useTheme();
  const labelId = useId();
  const [open, setOpen] = useState(false);

  const compactRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!compactRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (variant === 'compact') {
    return (
      <div
        ref={compactRef}
        className={`theme-toggle theme-toggle--compact ${className}`.trim()}
      >
        <button
          type="button"
          className="theme-toggle__cycle"
          aria-label={`Theme: ${LABELS[preference]}. Click to change.`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {ICONS[preference]}
          <span>{LABELS[preference]}</span>
        </button>
        {open ? (
          <ul className="theme-toggle__menu" role="listbox" aria-labelledby={labelId}>
            {options.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  role="option"
                  aria-selected={preference === opt}
                  className={preference === opt ? 'is-active' : ''}
                  onClick={() => {
                    setPreference(opt);
                    setOpen(false);
                  }}
                >
                  {ICONS[opt]}
                  {LABELS[opt]}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`theme-toggle theme-toggle--${variant} ${className}`.trim()}
      role="group"
      aria-labelledby={labelId}
    >
      <span id={labelId} className="theme-toggle__label">
        Theme
      </span>
      <div className="theme-toggle__segmented">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`theme-toggle__btn${preference === opt ? ' is-active' : ''}`}
            aria-pressed={preference === opt}
            onClick={() => setPreference(opt)}
            title={LABELS[opt]}
          >
            {ICONS[opt]}
            <span>{LABELS[opt]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
