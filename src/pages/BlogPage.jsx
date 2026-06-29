import { useSearchParams, Link } from "react-router-dom";
import POSTS from "../data/posts";
import { BlogNav, CtaBand, BlogFooter, Reveal, EASE_RISE } from "./BlogChrome";
import { motion, useReducedMotion } from "framer-motion";
import "./BlogPage.css";

const PAGE_SIZE = 9;

function Badges({ items }) {
  if (!items?.length) return null;
  return (
    <div className="blog-card__badges">
      {items.map((b) => (
        <span key={b.label} className={`blog-badge blog-badge--${b.tone}`}>{b.label}</span>
      ))}
    </div>
  );
}

function Card({ post, index }) {
  const reduce = useReducedMotion();
  const inner = (
    <article className="blog-card">
      <img src={post.image} alt={post.title} className="blog-card__image" loading="lazy" />
      <p className="blog-card__meta">{post.date}&nbsp;&middot; {post.author}</p>
      <h2 className="blog-card__title">
        <span>{post.title}</span>
        <span className="blog-card__arrow" aria-hidden>↗</span>
      </h2>
      <p className="blog-card__excerpt">{post.excerpt}</p>
      <Badges items={post.badges} />
    </article>
  );

  if (reduce) {
    return <Link to={`/blog/${post.slug}`} className="blog-card-link">{inner}</Link>;
  }

  // Stagger the cards in with the rise-and-fade, capped so later rows don't lag.
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.85, ease: EASE_RISE, delay: Math.min(index, 5) * 0.06 }}
    >
      <Link to={`/blog/${post.slug}`} className="blog-card-link">{inner}</Link>
    </motion.div>
  );
}

export default function BlogPage() {
  const [params, setParams] = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(POSTS.length / PAGE_SIZE));
  const rawPage = parseInt(params.get("page") || "1", 10);
  const page = Number.isNaN(rawPage) ? 1 : Math.min(Math.max(rawPage, 1), totalPages);

  const start = (page - 1) * PAGE_SIZE;
  const visible = POSTS.slice(start, start + PAGE_SIZE);

  const goTo = (p) => {
    setParams(p === 1 ? {} : { page: String(p) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="blog-page">
      <BlogNav active="/blog" />

      {/* Hero — espresso band */}
      <header className="blog-hero">
        <div className="blog-hero__inner">
          <Reveal>
            <span className="blog-hero__eyebrow blog-hero__eyebrow--pulse">Blog</span>
            <h1 className="blog-hero__title">
              CV strategy for the India–Gulf corridor.
            </h1>
            <p className="blog-hero__lead">
              Practical guides on UAE CV format, ATS scoring, visa-status lines, and
              the moves that get Gulf recruiters to call back — written for South
              Asian professionals navigating the Gulf job market.
            </p>
            <p className="blog-hero__lead">
              Every post is grounded in how Gulf ATS systems actually read your CV,
              and what to change before you hit submit.
            </p>
          </Reveal>
        </div>
      </header>

      {/* Post-count bar */}
      <div className="blog-countbar">
        {POSTS.length} posts
        <span className="blog-countbar__sep" aria-hidden>·</span>
        Page {page} / {totalPages}
      </div>

      {/* Post grid */}
      <section className="blog-grid-section" aria-label="Blog posts">
        <div className="blog-grid">
          {visible.map((post, i) => (
            <Card key={post.slug} post={post} index={i} />
          ))}
        </div>
      </section>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="blog-pagination" aria-label="Pagination">
          <button
            type="button"
            className="blog-pagination__nav"
            aria-disabled={page === 1}
            aria-label="Previous page"
            onClick={() => page > 1 && goTo(page - 1)}
          >
            ←
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={`blog-pagination__page${p === page ? " is-active" : ""}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => goTo(p)}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            className="blog-pagination__nav"
            aria-disabled={page === totalPages}
            aria-label="Next page"
            onClick={() => page < totalPages && goTo(page + 1)}
          >
            Next →
          </button>
        </nav>
      )}

      <CtaBand />
      <BlogFooter />
    </div>
  );
}
