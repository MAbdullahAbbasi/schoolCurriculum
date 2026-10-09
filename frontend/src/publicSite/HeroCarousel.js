import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { HOME_HERO_SLIDES } from './data/heroSlides';

const INTERVAL_MS = 6500;

/**
 * Shared hero with rotating educational background images.
 * Pass a unique `slides` array per page. Use variant="home" or "page".
 */
export default function HeroCarousel({
  variant = 'home',
  slides = HOME_HERO_SLIDES,
  eyebrow,
  title,
  lead,
  actions,
  ariaLabel = 'Page hero',
}) {
  const slideList = Array.isArray(slides) && slides.length > 0 ? slides : HOME_HERO_SLIDES;
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState({});
  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    setIndex(0);
    setFailed({});
  }, [slideList]);

  useEffect(() => {
    if (reduceMotion.current || slideList.length < 2) return undefined;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slideList.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [slideList]);

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

  const isHome = variant === 'home';
  const resolvedEyebrow = eyebrow ?? (isHome ? 'Welcome to The Learning Grove' : null);
  const resolvedTitle = title ?? (isHome ? 'Growing Minds. Building Futures.' : '');
  const resolvedLead =
    lead ??
    (isHome
      ? 'Discover a learning environment where curriculum, assessment, and student progress come together to support meaningful academic growth.'
      : null);

  const resolvedActions =
    actions !== undefined
      ? actions
      : isHome
        ? (
          <>
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
          </>
        )
        : null;

  return (
    <section
      className={`ps-hero${isHome ? '' : ' ps-hero--page'}`}
      aria-label={ariaLabel}
    >
      <div className="ps-hero__media" aria-hidden="true">
        {slideList.map((slide, i) => {
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

      <div className={`ps-container ps-hero__content${isHome ? '' : ' ps-hero__content--page'}`}>
        {resolvedEyebrow ? (
          <p className="ps-hero__eyebrow">{resolvedEyebrow}</p>
        ) : null}
        <h1 className="ps-hero__title">{resolvedTitle}</h1>
        {resolvedLead ? <p className="ps-hero__lead">{resolvedLead}</p> : null}
        {resolvedActions ? (
          <div className="ps-hero__actions">{resolvedActions}</div>
        ) : null}
      </div>

      <div className="ps-hero__dots" role="tablist" aria-label="Hero slides">
        {slideList.map((slide, i) => (
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
