import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import POSTS from "../data/posts";
import "./BlogPage.css";
import "./BlogPostPage.css";

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
  const navigate = useNavigate();
  return (
    <nav className="blog-nav">
      <button className="blog-nav__logo" onClick={() => navigate("/")}>CVPassport</button>
      <div className="blog-nav__right">
        <div className="blog-nav__links">
          <button className="blog-nav__link is-active" type="button" onClick={() => navigate("/blog")}>Blog</button>
          <button className="blog-nav__link" type="button" onClick={() => navigate("/tools")}>Tools</button>
          <button className="blog-nav__link" type="button" onClick={() => navigate("/pricing")}>Pricing</button>
          <button className="blog-nav__link" type="button" onClick={() => navigate("/#newsletter")}>Newsletter</button>
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
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return <NotFound />;

  const related = POSTS.filter((p) => p.slug !== slug).slice(0, 2);

  return (
    <div className="blog-page blog-post-page">
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
                  if (block.type === "quote") {
                    return <blockquote key={i} className="blog-post__quote">{block.text}</blockquote>;
                  }
                  return <p key={i}>{block.text}</p>;
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
            <button
              type="button"
              className="blog-post__cta-btn"
              onClick={() => navigate("/signup")}
            >
              Get Started Free →
            </button>
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
          <button className="blog-mobile-menu__link" type="button" onClick={() => { setMenuOpen(false); navigate("/blog"); }}>Blog</button>
          <button className="blog-mobile-menu__link" type="button" onClick={() => { setMenuOpen(false); navigate("/tools"); }}>Tools</button>
          <button className="blog-mobile-menu__link" type="button" onClick={() => { setMenuOpen(false); navigate("/pricing"); }}>Pricing</button>
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
