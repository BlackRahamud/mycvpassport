import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import POSTS from "../data/posts";
import "./BlogPage.css";
import "./BlogPostPage.css";

// Inline parser for blog body text. Supports:
//   **bold**        → <strong>
//   [label](/path)  → <Link> (internal) or <a> (external)
// Unmatched text passes through untouched.
function renderInline(text) {
  const tokenRegex = /(\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*)/g;
  const out = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) out.push(text.slice(lastIndex, match.index));
    const tok = match[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={`b-${key++}`}>{tok.slice(2, -2)}</strong>);
    } else {
      const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      const label = linkMatch[1];
      const href = linkMatch[2];
      if (href.startsWith("/")) {
        out.push(<Link key={`l-${key++}`} to={href}>{label}</Link>);
      } else {
        out.push(<a key={`l-${key++}`} href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
      }
    }
    lastIndex = tokenRegex.lastIndex;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return out;
}

function Badges({ items }) {
  return (
    <div className="blog-card__badges">
      {items.map((b) => (
        <span key={b.label} className={`blog-badge blog-badge--${b.tone}`}>{b.label}</span>
      ))}
    </div>
  );
}

function RelatedCard({ post }) {
  return (
    <Link to={`/blog/${post.slug}`} className="blog-card-link">
      <article className="blog-card">
        <img src={post.image} alt="" className="blog-card__image" />
        <p className="blog-card__meta">{post.author}&nbsp;&middot; {post.date}</p>
        <h3 className="blog-card__title">
          <span>{post.title}</span>
          <span className="blog-card__arrow" aria-hidden>↗</span>
        </h3>
        <p className="blog-card__excerpt">{post.excerpt}</p>
        <Badges items={post.badges} />
      </article>
    </Link>
  );
}

function BlogNav({ onHamburger }) {
  return (
    <nav className="blog-nav">
      <Link className="blog-nav__logo" to="/">CVPassport</Link>
      <div className="blog-nav__right">
        <div className="blog-nav__links">
          <Link className="blog-nav__link is-active" to="/blog">Blog</Link>
          <Link className="blog-nav__link" to="/tools">Tools</Link>
          <Link className="blog-nav__link" to="/pricing">Pricing</Link>
          <Link className="blog-nav__link" to="/#newsletter">Newsletter</Link>
        </div>
      </div>
      <button
        className="blog-nav__hamburger"
        type="button"
        aria-label="Open menu"
        onClick={onHamburger}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="7" x2="21" y2="7" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="17" x2="21" y2="17" />
        </svg>
      </button>
    </nav>
  );
}

function NotFound() {
  return (
    <div className="blog-page blog-post-page">
      <BlogNav onHamburger={() => {}} />
      <div className="blog-post__notfound">
        <h1>Post not found</h1>
        <p>This article doesn&rsquo;t exist, or the link is mistyped.</p>
        <Link to="/blog" className="blog-post__back">← Back to Blog</Link>
      </div>
    </div>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const [menuOpen, setMenuOpen] = useState(false);

  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return <NotFound />;

  const related = POSTS.filter((p) => p.slug !== slug).slice(0, 2);
  const canonical = `https://www.mycvpassport.com/blog/${post.slug}`;
  const metaTitle = post.metaTitle || `${post.title} | CVPassport`;
  const metaDesc = post.metaDescription || post.excerpt;

  return (
    <div className="blog-page blog-post-page">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonical} />
        {post.image && <meta property="og:image" content={post.image} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {post.image && <meta name="twitter:image" content={post.image} />}
      </Helmet>
      <BlogNav onHamburger={() => setMenuOpen(true)} />

      <div className="blog-post__layout">
        <article className="blog-post__article">
          <h1 className="blog-post__title">{post.title}</h1>

          <div className="blog-post__meta-row">
            <span className={`blog-badge blog-badge--${post.badges[0]?.tone || "purple"}`}>{post.category}</span>
            <span className="blog-post__meta-sep">·</span>
            <span className="blog-post__meta-text">{post.readTime}</span>
            <span className="blog-post__meta-sep">·</span>
            <span className="blog-post__meta-text">By {post.author} · Dubai, UAE</span>
          </div>

          <img src={post.image} alt="" className="blog-post__hero" />

          <div className="blog-post__body">
            <p className="blog-post__lead">{post.excerpt}</p>

            {post.body
              ? post.body.map((block, i) => {
                  if (block.type === "h2") {
                    return <h2 key={i} className="blog-post__h2">{block.text}</h2>;
                  }
                  if (block.type === "h3") {
                    return <h3 key={i} className="blog-post__h3">{block.text}</h3>;
                  }
                  if (block.type === "quote") {
                    return <blockquote key={i} className="blog-post__quote">{renderInline(block.text)}</blockquote>;
                  }
                  if (block.type === "ul") {
                    return (
                      <ul key={i} className="blog-post__ul">
                        {block.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
                      </ul>
                    );
                  }
                  if (block.type === "table") {
                    return (
                      <div key={i} className="blog-post__table-wrap">
                        <table className="blog-post__table">
                          <thead>
                            <tr>{block.headers.map((h, j) => <th key={j}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {block.rows.map((row, j) => (
                              <tr key={j}>{row.map((cell, k) => <td key={k}>{cell}</td>)}</tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }
                  if (block.type === "cta") {
                    return (
                      <p key={i} className="blog-post__cta-row">
                        <Link to={block.href} className="blog-post__cta-inline">{block.label}</Link>
                      </p>
                    );
                  }
                  if (block.type === "hr") {
                    return <hr key={i} className="blog-post__hr" />;
                  }
                  return <p key={i}>{renderInline(block.text)}</p>;
                })
              : (
                <p>Full article coming soon. In the meantime, the summary above captures the key takeaway.</p>
              )}
          </div>

          <Link to="/blog" className="blog-post__back">← Back to Blog</Link>
        </article>

        <aside className="blog-post__sidebar">
          <div className="blog-post__cta-card">
            <h3 className="blog-post__cta-title">Ready to build your UAE CV?</h3>
            <p className="blog-post__cta-sub">Get your ATS score in 60 seconds.</p>
            <Link to="/builder" className="blog-post__cta-btn">
              Get Started Free →
            </Link>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="blog-section blog-post__related">
          <h2 className="blog-section__heading">Related posts</h2>
          <div className="blog-post__related-grid">
            {related.map((p) => (
              <RelatedCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      )}

      {menuOpen && (
        <div className="blog-mobile-menu" role="dialog" aria-modal="true">
          <div className="blog-mobile-menu__logo">CVPassport</div>
          <Link className="blog-mobile-menu__link" to="/blog" onClick={() => setMenuOpen(false)}>Blog</Link>
          <Link className="blog-mobile-menu__link" to="/tools" onClick={() => setMenuOpen(false)}>Tools</Link>
          <Link className="blog-mobile-menu__link" to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
          <button className="blog-mobile-menu__link" type="button" onClick={() => setMenuOpen(false)}>Newsletter</button>
          <button
            className="blog-mobile-menu__close"
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
