import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
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
        <header className="ps-page-hero">
          <div className="ps-container ps-article__header">
            <p className="ps-label">{article.category}</p>
            <h1>{article.title}</h1>
            <p className="ps-meta">{article.readMinutes} min read</p>
          </div>
        </header>

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
