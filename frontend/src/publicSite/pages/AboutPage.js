import React from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';
import { ABOUT_HERO_SLIDES } from '../data/heroSlides';

export default function AboutPage() {
  return (
    <div className="ps-page">
      <HeroCarousel
        variant="page"
        slides={ABOUT_HERO_SLIDES}
        ariaLabel="About"
        eyebrow="About"
        title="About The Learning Grove"
        lead="A connected application for curriculum, assessment, student records, and academic reporting."
      />

      <section className="ps-section">
        <div className="ps-container ps-prose">
          <h2>Purpose</h2>
          <p>
            The Learning Grove helps school teams organize essential academic
            processes in one place. It brings together curriculum objectives,
            courses and assessments, student enrollment, marks and grading,
            report generation, and progression records.
          </p>

          <h2>Who It Serves</h2>
          <p>
            The application is designed for role-based access. Depending on
            permissions, users may work as Super Admin, Admin, Course Admin,
            Educator, Guest, or through the student portal where credentials
            have been assigned.
          </p>

          <h2>What It Helps Organize</h2>
          <ul>
            <li>Curriculum content and learning objectives</li>
            <li>Course creation and assessment workflows</li>
            <li>Student (Seedling) records and enrollment</li>
            <li>Marks entry, locking, and grading schemes</li>
            <li>Report cards and class result sheets</li>
            <li>Student promotion and alumni records</li>
          </ul>

          <h2>A Note on This Site</h2>
          <p>
            This public website explains the platform’s purpose and features. It
            does not expose private student data or administrative tools. School
            teams sign in through the Login page to access the management
            application.
          </p>

          <div className="ps-page-actions">
            <Link to="/features" className="ps-btn ps-btn--primary">
              Explore Features
            </Link>
            <Link to="/login" className="ps-btn ps-btn--ghost">
              Login
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
