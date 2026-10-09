import React from 'react';
import { Link } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';
import { ARTICLES } from '../data/articles';

export default function ArticlesPage() {
  return (
    <div className="ps-page">
      <HeroCarousel
        variant="page"
        ariaLabel="Articles"
        eyebrow="Articles"
        title="Explore Ideas in Education"
        lead="Practical articles on curriculum clarity, assessment, reporting, and supporting students through progression."
      />

      <section className="ps-section">
        <div className="ps-container">
          <div className="ps-card-grid ps-card-grid--2">
            {ARTICLES.map((article) => (
              <article key={article.slug} className="ps-article-card ps-article-card--wide">
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
                  <h2>{article.title}</h2>
                  <p>{article.excerpt}</p>
                  <p className="ps-meta">{article.readMinutes} min read</p>
                  <Link to={`/articles/${article.slug}`} className="ps-text-link">
                    Read More
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
