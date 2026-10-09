import React from 'react';

/** Simple educational brand mark for The Learning Grove */
export default function BrandMark({ size = 36, className = '' }) {
  const s = Number(size) || 36;
  return (
    <svg
      className={className}
      width={s}
      height={s}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="64" height="64" rx="16" fill="#1B4332" />
      <path
        d="M32 12c-1.2 6.5-5.8 11.2-12.5 13.2 6.7 2 11.3 6.7 12.5 13.3 1.2-6.6 5.8-11.3 12.5-13.3C37.8 23.2 33.2 18.5 32 12z"
        fill="#95D5B2"
      />
      <path
        d="M32 28c-1 5.4-4.8 9.2-10.4 10.8C27.2 40.4 31 44.2 32 49.6c1-5.4 4.8-9.2 10.4-10.8C36.8 37.2 33 33.4 32 28z"
        fill="#52B788"
      />
      <rect x="30" y="40" width="4" height="14" rx="2" fill="#D8F3DC" />
      <circle cx="48" cy="18" r="3" fill="#D4A373" opacity="0.9" />
    </svg>
  );
}
