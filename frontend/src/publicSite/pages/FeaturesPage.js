import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';

const FEATURES = [
  {
    id: 'curriculum',
    title: 'Curriculum and Learning Objectives',
    desc: 'Organize curriculum content and learning objectives so teaching teams share a clear academic structure.',
  },
  {
    id: 'assessment',
    title: 'Course and Assessment Management',
    desc: 'Create courses and manage assessment workflows that keep evaluation organized and reviewable.',
  },
  {
    id: 'students',
    title: 'Student Enrollment and Records',
    desc: 'Maintain student profiles, enrollment, and grade placement—often referred to as Seedlings in the application.',
  },
  {
    id: 'educators',
    title: 'Educator Assignment',
    desc: 'Support educator and course administrator roles so the right people can manage the right academic work.',
  },
  {
    id: 'grading',
    title: 'Marks and Grading',
    desc: 'Record marks, apply grading schemes, and use locking workflows to protect finalized results.',
  },
  {
    id: 'reporting',
    title: 'Student Report Cards',
    desc: 'Generate individual report cards from recorded academic results for review and distribution.',
  },
  {
    id: 'results',
    title: 'Class Result Sheets',
    desc: 'Review class-level outcomes in structured result sheets that support consistent academic overview.',
  },
  {
    id: 'promotion',
    title: 'Student Promotion and Alumni Records',
    desc: 'Update grade progression and keep alumni history when students complete their pathway through the school.',
  },
];

export default function FeaturesPage() {
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
        ariaLabel="Features"
        eyebrow="Features"
        title="Platform Features"
        lead="An overview of what The Learning Grove helps school teams manage—focused on verified application capabilities."
      />

      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-card-grid ps-card-grid--2">
            {FEATURES.map((f) => (
              <article key={f.id} id={f.id} className="ps-card">
                <h2>{f.title}</h2>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
          <div className="ps-page-actions">
            <Link to="/login" className="ps-btn ps-btn--primary">
              Login to Your Account
            </Link>
            <Link to="/articles" className="ps-btn ps-btn--ghost">
              Read Articles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
