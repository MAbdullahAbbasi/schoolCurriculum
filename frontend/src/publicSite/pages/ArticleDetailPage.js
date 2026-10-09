import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import HeroCarousel from '../HeroCarousel';
import { getArticleBySlug } from '../data/articles';

export default function ArticleDetailPage() {
  const { slug } = useParams();
  const article = getArticleBySlug(slug);

  if (!article) {
    return <Navigate to="/articles" replace />;
  }

  return (
    <div className="ps-page">
      <article className="ps-article">
        <HeroCarousel
          variant="page"
          ariaLabel={article.title}
          eyebrow={article.category}
          title={article.title}
          lead={`${article.readMinutes} min read · ${article.excerpt}`}
        />

        <div className="ps-container">
          <div className="ps-article__cover">
            <img
              src={article.image}
              alt={article.imageAlt}
              loading="eager"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('is-fallback');
              }}
            />
          </div>
          <div className="ps-prose ps-article__body">
            {article.body.map((paragraph) => (
              <p key={paragraph.slice(0, 48)}>{paragraph}</p>
            ))}
            <div className="ps-page-actions">
              <Link to="/articles" className="ps-btn ps-btn--ghost">
                Back to Articles
              </Link>
              <Link to="/features" className="ps-btn ps-btn--primary">
                Explore Features
              </Link>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}
