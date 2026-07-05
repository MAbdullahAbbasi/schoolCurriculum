import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GUEST_TOUR_STEPS } from './guestTourSteps';
import './GuestTour.css';

const SPOTLIGHT_PAD = 8;
const VIEWPORT_MARGIN = 12;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTargetRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) return null;
  return rect;
}

function computeCardPosition(rect, placement) {
  const cardWidth = Math.min(420, window.innerWidth - VIEWPORT_MARGIN * 2);
  const cardHeight = 220;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!rect) {
    return { top: vh / 2 - cardHeight / 2, left: vw / 2 - cardWidth / 2 };
  }

  let top;
  let left;

  switch (placement) {
    case 'right':
      top = rect.top + rect.height / 2 - cardHeight / 2;
      left = rect.right + 16;
      if (left + cardWidth > vw - VIEWPORT_MARGIN) {
        left = rect.left - cardWidth - 16;
      }
      break;
    case 'left':
      top = rect.top + rect.height / 2 - cardHeight / 2;
      left = rect.left - cardWidth - 16;
      if (left < VIEWPORT_MARGIN) {
        left = rect.right + 16;
      }
      break;
    case 'bottom':
      top = rect.bottom + 12;
      left = rect.left + rect.width / 2 - cardWidth / 2;
      break;
    default:
      top = rect.bottom + 12;
      left = rect.left;
  }

  top = clamp(top, VIEWPORT_MARGIN, vh - cardHeight - VIEWPORT_MARGIN);
  left = clamp(left, VIEWPORT_MARGIN, vw - cardWidth - VIEWPORT_MARGIN);
  return { top, left };
}

const GuestTour = ({ runToken, onEnsureSidebarOpen }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [closed, setClosed] = useState(false);
  const [spotRect, setSpotRect] = useState(null);
  const [cardPos, setCardPos] = useState({ top: 0, left: 0 });
  const cardRef = useRef(null);

  const steps = GUEST_TOUR_STEPS;
  const step = steps[stepIndex];
  const isCenter = step?.type === 'center';
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const updateLayout = useCallback(() => {
    if (!step) return;
    if (isCenter) {
      setSpotRect(null);
      setCardPos({ top: 0, left: 0 });
      return;
    }
    const rect = getTargetRect(step.target);
    setSpotRect(rect);
    setCardPos(computeCardPosition(rect, step.placement || 'right'));
  }, [step, isCenter]);

  useEffect(() => {
    setClosed(false);
    setStepIndex(0);
  }, [runToken]);

  useEffect(() => {
    if (closed) return undefined;
    onEnsureSidebarOpen?.();
    const t = window.setTimeout(updateLayout, 80);
    return () => window.clearTimeout(t);
  }, [stepIndex, runToken, closed, onEnsureSidebarOpen, updateLayout]);

  useLayoutEffect(() => {
    if (!closed) updateLayout();
  }, [updateLayout, closed]);

  useEffect(() => {
    if (closed) return undefined;
    const onResize = () => updateLayout();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [updateLayout, closed]);

  useEffect(() => {
    if (closed) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [closed]);

  useEffect(() => {
    if (closed) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setClosed(true);
      } else if (e.key === 'ArrowRight' && !isLast) {
        setStepIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft' && !isFirst) {
        setStepIndex((i) => i - 1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closed, isFirst, isLast]);

  const closeTour = () => setClosed(true);

  if (closed || !step) {
    return null;
  }

  const spotlightStyle = spotRect
    ? {
        top: spotRect.top - SPOTLIGHT_PAD,
        left: spotRect.left - SPOTLIGHT_PAD,
        width: spotRect.width + SPOTLIGHT_PAD * 2,
        height: spotRect.height + SPOTLIGHT_PAD * 2,
      }
    : null;

  const cardClass = isCenter
    ? 'guest-tour-card guest-tour-card--center'
    : 'guest-tour-card';

  const cardStyle = isCenter ? undefined : { top: cardPos.top, left: cardPos.left };

  return createPortal(
    <div className="guest-tour-overlay" role="dialog" aria-modal="true" aria-labelledby="guest-tour-title">
      <div className="guest-tour-backdrop" aria-hidden="true" />
      {!isCenter && spotlightStyle && <div className="guest-tour-spotlight" style={spotlightStyle} />}
      <div ref={cardRef} className={cardClass} style={cardStyle}>
        <p className="guest-tour-step-label">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <h2 id="guest-tour-title" className="guest-tour-title">
          {step.title}
        </h2>
        <p className="guest-tour-body">{step.body}</p>
        <div className="guest-tour-actions">
          <div className="guest-tour-actions-left">
            {!isFirst && (
              <button type="button" className="guest-tour-btn guest-tour-btn-secondary" onClick={() => setStepIndex((i) => i - 1)}>
                Back
              </button>
            )}
          </div>
          <div className="guest-tour-actions-right">
            {!isLast && (
              <button type="button" className="guest-tour-btn guest-tour-btn-ghost" onClick={closeTour}>
                Skip tour
              </button>
            )}
            {isLast ? (
              <button type="button" className="guest-tour-btn guest-tour-btn-primary" onClick={closeTour}>
                Start exploring
              </button>
            ) : (
              <button type="button" className="guest-tour-btn guest-tour-btn-primary" onClick={() => setStepIndex((i) => i + 1)}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default GuestTour;
