import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const SLIDES = [
  {
    src: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1920&q=80',
    alt: 'Teacher guiding students in a bright classroom',
  },
  {
    src: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1920&q=80',
    alt: 'Children learning together with books',
  },
  {
    src: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=1920&q=80',
    alt: 'Students collaborating on a learning activity',
  },
  {
    src: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1920&q=80',
    alt: 'Stack of educational books ready for study',
  },
];

const INTERVAL_MS = 6500;

export default function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    if (reduceMotion.current) return undefined;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const scrollToLearning = (e) => {
    e.preventDefault();
    const el = document.getElementById('academics');
    if (el) {
      el.scrollIntoView({
        behavior: reduceMotion.current ? 'auto' : 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <section className="ps-hero" aria-label="Welcome">
      <div className="ps-hero__media" aria-hidden="true">
        {SLIDES.map((slide, i) => {
          const broken = failed[i];
          return (
            <div
              key={slide.src}
              className={`ps-hero__slide${i === index ? ' is-active' : ''}${
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
        <div className="ps-hero__overlay" />
      </div>

      <div className="ps-container ps-hero__content">
        <p className="ps-hero__eyebrow">Welcome to The Learning Grove</p>
        <h1 className="ps-hero__title">Growing Minds. Building Futures.</h1>
        <p className="ps-hero__lead">
          Discover a learning environment where curriculum, assessment, and
          student progress come together to support meaningful academic growth.
        </p>
        <div className="ps-hero__actions">
          <a
            href="#academics"
            className="ps-btn ps-btn--light"
            onClick={scrollToLearning}
          >
            Explore Our Learning
          </a>
          <Link to="/login" className="ps-btn ps-btn--outline-light">
            Get Started
          </Link>
        </div>
      </div>

      <div className="ps-hero__dots" role="tablist" aria-label="Hero slides">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show slide ${i + 1}: ${slide.alt}`}
            className={`ps-hero__dot${i === index ? ' is-active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
    </section>
  );
}
