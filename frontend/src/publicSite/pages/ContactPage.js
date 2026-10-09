import React from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';
import { CONTACT_HERO_SLIDES } from '../data/heroSlides';

/**
 * Contact page without a fake form.
 * No verified public email/phone/address is available in the project,
 * so visitors are guided to login for school-team access.
 */
export default function ContactPage() {
  return (
    <div className="ps-page">
      <HeroCarousel
        variant="page"
        slides={CONTACT_HERO_SLIDES}
        ariaLabel="Contact"
        eyebrow="Contact"
        title="Contact The Learning Grove"
        lead="Reach your school administrators through your institution’s usual channels. This public site does not publish unverified contact details."
      />

      <section className="ps-section">
        <div className="ps-container ps-prose">
          <h2>For Teachers and Administrators</h2>
          <p>
            If you already have an account, sign in to access curriculum,
            assessment, student records, and reporting tools.
          </p>
          <div className="ps-page-actions">
            <Link to="/login" className="ps-btn ps-btn--primary">
              Login to Your Account
            </Link>
            <Link to="/about" className="ps-btn ps-btn--ghost">
              About the Platform
            </Link>
          </div>

          <h2>For Parents and Visitors</h2>
          <p>
            Please contact your school office directly for enrollment questions,
            academic records, or institutional information. Public contact forms
            are not enabled on this website.
          </p>
        </div>
      </section>
    </div>
  );
}
