import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';
import { ACADEMICS_HERO_SLIDES } from '../data/heroSlides';

const STAGES = [
  {
    id: 'early-learning',
    title: 'Early Learning',
    range: 'KG-2',
    desc: 'Student management in The Learning Grove can place learners in early learning grade categories such as KG-2. Records, enrollment, and progression tools apply within the same structured environment used across grades.',
  },
  {
    id: 'primary',
    title: 'Primary Education',
    range: 'Grades 1–5',
    desc: 'Primary grade categories are supported for enrollment, assessment records, and reporting. Teams can maintain academic information consistently as students move through these years.',
  },
  {
    id: 'secondary',
    title: 'Middle and Secondary Education',
    range: 'Grades 6–10',
    desc: 'Middle and secondary grade categories are available in the platform for student records, marks management, and progression—including promotion workflows when administrators update grade placement.',
  },
];

export default function AcademicsPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hash]);

  return (
    <div className="ps-page">
      <HeroCarousel
        variant="page"
        slides={ACADEMICS_HERO_SLIDES}
        ariaLabel="Academics"
        eyebrow="Academics"
        title="Academic Stages on the Platform"
        lead="The groupings below describe grade categories supported in student management. They are presentation categories for the software and should not be read as a published institutional prospectus."
      />

      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-stack">
            {STAGES.map((stage) => (
              <article key={stage.id} id={stage.id} className="ps-detail-card">
                <p className="ps-label">{stage.range}</p>
                <h2>{stage.title}</h2>
                <p>{stage.desc}</p>
              </article>
            ))}
          </div>
          <div className="ps-page-actions">
            <Link to="/features" className="ps-btn ps-btn--primary">
              See Platform Features
            </Link>
            <Link to="/contact" className="ps-btn ps-btn--ghost">
              Contact
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
