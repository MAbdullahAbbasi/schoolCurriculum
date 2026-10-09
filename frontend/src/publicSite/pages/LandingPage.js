import React from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';
import { ARTICLES } from '../data/articles';

const INTRO_FEATURES = [
  {
    title: 'Curriculum Management',
    desc: 'Organize curriculum content and learning objectives.',
    to: '/features#curriculum',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4 5h16v2H4V5zm0 6h10v2H4v-2zm0 6h16v2H4v-2z"
        />
      </svg>
    ),
  },
  {
    title: 'Assessment Management',
    desc: 'Create courses and manage structured assessment workflows.',
    to: '/features#assessment',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7 3h10a2 2 0 012 2v14l-7-3-7 3V5a2 2 0 012-2z"
        />
      </svg>
    ),
  },
  {
    title: 'Student Development',
    desc: 'Maintain student records and support academic progression.',
    to: '/features#students',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5z"
        />
      </svg>
    ),
  },
  {
    title: 'Academic Reporting',
    desc: 'Generate report cards and class result sheets.',
    to: '/features#reporting',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5 3h14v18H5V3zm3 4v2h8V7H8zm0 4v2h8v-2H8zm0 4v2h5v-2H8z"
        />
      </svg>
    ),
  },
];

const ACADEMIC_STAGES = [
  {
    title: 'Early Learning',
    range: 'KG-2',
    desc: 'A platform category for early learning records and grade placement supported in student management.',
    image:
      'https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80',
    alt: 'Young learners engaged in classroom activities',
    to: '/academics#early-learning',
  },
  {
    title: 'Primary Education',
    range: 'Grades 1–5',
    desc: 'Structured support for primary grade records, enrollment, and academic tracking.',
    image:
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=80',
    alt: 'Primary students reading together',
    to: '/academics#primary',
  },
  {
    title: 'Middle & Secondary',
    range: 'Grades 6–10',
    desc: 'Tools for middle and secondary grade placement, assessment records, and progression.',
    image:
      'https://images.unsplash.com/photo-1523240795612-9e26bda65c69?auto=format&fit=crop&w=900&q=80',
    alt: 'Older students collaborating on schoolwork',
    to: '/academics#secondary',
  },
];

const ALL_FEATURES = [
  {
    id: 'curriculum',
    title: 'Curriculum & Learning Objectives',
    desc: 'Organize curriculum content and objectives in one place.',
  },
  {
    id: 'assessment',
    title: 'Course & Assessment Management',
    desc: 'Build courses and manage assessment structures with care.',
  },
  {
    id: 'students',
    title: 'Student Enrollment & Records',
    desc: 'Keep student profiles, enrollment, and grade placement organized.',
  },
  {
    id: 'educators',
    title: 'Educator Assignment',
    desc: 'Connect educators and course administrators to the right work.',
  },
  {
    id: 'grading',
    title: 'Marks & Grading',
    desc: 'Enter marks, apply grading schemes, and manage locking workflows.',
  },
  {
    id: 'reporting',
    title: 'Student Report Cards',
    desc: 'Produce individual academic reports from recorded results.',
  },
  {
    id: 'results',
    title: 'Class Result Sheets',
    desc: 'Review class-level outcomes in a consistent format.',
  },
  {
    id: 'promotion',
    title: 'Promotion & Alumni Records',
    desc: 'Support grade progression and maintain alumni history.',
  },
];

const WORKFLOW = [
  'Organize Curriculum',
  'Create Assessments',
  'Enroll Students',
  'Record and Manage Marks',
  'Review Academic Reports',
  'Support Student Progression',
];

const WHY_POINTS = [
  'Organized curriculum information',
  'Structured assessment workflows',
  'Centralized student records',
  'Consistent grading processes',
  'Convenient academic reporting',
  'Clear student progression records',
];

function FeatureIcon({ index }) {
  const paths = [
    'M4 6h16v2H4V6zm0 5h12v2H4v-2zm0 5h16v2H4v-2z',
    'M6 4h12a1 1 0 011 1v14l-7-3-7 3V5a1 1 0 011-1z',
    'M12 12a3.5 3.5 0 100-7 3.5 3.5 0 000 7zm-7 8c0-3.3 3.1-5 7-5s7 1.7 7 5v1H5v-1z',
    'M8 8a2 2 0 114 0 2 2 0 01-4 0zm6 0a2 2 0 114 0 2 2 0 01-4 0zM5 18c.8-2.2 2.8-3.5 5.5-3.5.6 0 1.1.1 1.6.2-.3.8-.5 1.6-.5 2.5v.8H5zm9.1-3.3c.7-.1 1.5-.2 2.4-.2 2.7 0 4.7 1.3 5.5 3.5h-6.6v-.8c0-.9.2-1.7.7-2.5z',
    'M7 3h10v2H7V3zm-1 4h12v14H6V7zm3 3v2h6v-2H9zm0 4v2h6v-2H9z',
    'M5 4h14v16H5V4zm3 3v2h8V7H8zm0 4v2h8v-2H8zm0 4v2h5v-2H8z',
    'M4 5h16v3H4V5zm0 5h7v9H4v-9zm9 0h7v9h-7v-9z',
    'M12 3l8 4v5c0 4.5-3.2 8.5-8 9.8C7.2 20.5 4 16.5 4 12V7l8-4z',
  ];
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d={paths[index % paths.length]} />
    </svg>
  );
}

export default function LandingPage() {
  return (
    <>
      <HeroCarousel />

      <section className="ps-section" aria-labelledby="intro-heading">
        <div className="ps-container">
          <div className="ps-section__header">
            <h2 id="intro-heading">Learning, Organized with Purpose</h2>
            <p>
              The Learning Grove brings curriculum organization, assessment
              management, and student academic records together in one
              structured environment.
            </p>
          </div>
          <div className="ps-card-grid ps-card-grid--4">
            {INTRO_FEATURES.map((f) => (
              <article key={f.title} className="ps-card">
                <div className="ps-card__icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <Link to={f.to} className="ps-text-link">
                  Learn More
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-section ps-section--cream" aria-labelledby="about-heading">
        <div className="ps-container ps-split">
          <div className="ps-split__media">
            <img
              src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1100&q=80"
              alt="Bright classroom ready for learning"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('is-fallback');
              }}
            />
          </div>
          <div className="ps-split__text">
            <h2 id="about-heading">A Thoughtful Approach to Learning</h2>
            <p>
              The Learning Grove provides a structured environment for managing
              curriculum objectives, academic assessments, student records, and
              educational reporting. Its purpose is to help organize essential
              academic processes in one connected application.
            </p>
            <Link to="/about" className="ps-btn ps-btn--primary">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      <section
        id="academics"
        className="ps-section"
        aria-labelledby="academics-heading"
      >
        <div className="ps-container">
          <div className="ps-section__header">
            <h2 id="academics-heading">Academic Stages Supported by the Platform</h2>
            <p>
              These groupings reflect grade categories available in student
              management. They are presentation categories for the platform—not
              a published list of institutional programs.
            </p>
          </div>
          <div className="ps-card-grid ps-card-grid--3">
            {ACADEMIC_STAGES.map((stage) => (
              <article key={stage.title} className="ps-stage-card">
                <div className="ps-stage-card__media">
                  <img
                    src={stage.image}
                    alt={stage.alt}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('is-fallback');
                    }}
                  />
                </div>
                <div className="ps-stage-card__body">
                  <p className="ps-label">{stage.range}</p>
                  <h3>{stage.title}</h3>
                  <p>{stage.desc}</p>
                  <Link to={stage.to} className="ps-text-link">
                    Explore
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-section ps-section--forest" aria-labelledby="philosophy-heading">
        <div className="ps-container ps-split ps-split--reverse">
          <div className="ps-split__text">
            <h2 id="philosophy-heading">
              Learning with Purpose. Growing with Confidence.
            </h2>
            <p>
              The Learning Grove brings essential academic work into one place
              so educators and administrators can focus on clear processes and
              reliable records.
            </p>
            <ul className="ps-checklist">
              <li>Curriculum and learning objectives</li>
              <li>Structured assessments</li>
              <li>Student academic records</li>
              <li>Grading and reporting</li>
              <li>Student progression and alumni records</li>
            </ul>
          </div>
          <div className="ps-split__media">
            <img
              src="https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1100&q=80"
              alt="Books representing continuous learning"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('is-fallback');
              }}
            />
          </div>
        </div>
      </section>

      <section
        id="features"
        className="ps-section"
        aria-labelledby="features-heading"
      >
        <div className="ps-container">
          <div className="ps-section__header">
            <h2 id="features-heading">Explore All Features</h2>
            <p>
              A clear overview of platform capabilities for visitors, parents,
              and school teams—without exposing private student data.
            </p>
          </div>
          <div className="ps-card-grid ps-card-grid--4">
            {ALL_FEATURES.map((f, i) => (
              <article key={f.id} className="ps-card" id={f.id}>
                <div className="ps-card__icon">
                  <FeatureIcon index={i} />
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <Link to={`/features#${f.id}`} className="ps-text-link">
                  Learn More
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-section ps-section--cream" aria-labelledby="howto-heading">
        <div className="ps-container">
          <div className="ps-section__header">
            <h2 id="howto-heading">How The Learning Grove Works</h2>
            <p>
              A practical workflow educators and administrators follow inside
              the application—step by step, with manual review where needed.
            </p>
          </div>
          <ol className="ps-timeline">
            {WORKFLOW.map((step, i) => (
              <li key={step} className="ps-timeline__item">
                <span className="ps-timeline__num" aria-hidden="true">
                  {i + 1}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="ps-section" aria-labelledby="articles-heading">
        <div className="ps-container">
          <div className="ps-section__header ps-section__header--row">
            <div>
              <h2 id="articles-heading">Explore Ideas in Education</h2>
              <p>
                Short articles on curriculum clarity, assessment, reporting, and
                student progression.
              </p>
            </div>
            <Link to="/articles" className="ps-btn ps-btn--ghost">
              View All Articles
            </Link>
          </div>
          <div className="ps-card-grid ps-card-grid--4">
            {ARTICLES.map((article) => (
              <article key={article.slug} className="ps-article-card">
                <div className="ps-article-card__media">
                  <img
                    src={article.image}
                    alt={article.imageAlt}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement?.classList.add('is-fallback');
                    }}
                  />
                </div>
                <div className="ps-article-card__body">
                  <p className="ps-label">{article.category}</p>
                  <h3>{article.title}</h3>
                  <p>{article.excerpt}</p>
                  <Link to={`/articles/${article.slug}`} className="ps-text-link">
                    Read More
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ps-section ps-section--muted" aria-labelledby="why-heading">
        <div className="ps-container">
          <div className="ps-section__header">
            <h2 id="why-heading">Why Choose The Learning Grove?</h2>
            <p>
              Strengths grounded in what the platform actually provides for
              school teams.
            </p>
          </div>
          <ul className="ps-why-grid">
            {WHY_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="ps-cta" aria-labelledby="cta-heading">
        <div className="ps-container ps-cta__inner">
          <h2 id="cta-heading">Ready to Explore The Learning Grove?</h2>
          <p>
            Discover a structured way to manage curriculum, assessment, and
            student academic records.
          </p>
          <div className="ps-hero__actions">
            <Link to="/features" className="ps-btn ps-btn--light">
              Explore Features
            </Link>
            <Link to="/login" className="ps-btn ps-btn--outline-light">
              Login to Your Account
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
