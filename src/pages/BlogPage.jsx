import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./BlogPage.css";

const POSTS = [
  {
    title: "Should You Put Passport Details on Your UAE CV?",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "Most Indian professionals make this mistake on their UAE CV. Here's what ATS systems actually want.",
    badges: [{ label: "UAE Jobs", tone: "purple" }, { label: "ATS Tips", tone: "blue" }],
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
  },
  {
    title: "ATS Score Guide for GCC Jobs: What Recruiters See",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "We scanned 500 CVs through UAE ATS systems. Here's exactly what kills your score.",
    badges: [{ label: "ATS", tone: "purple" }, { label: "Research", tone: "pink" }],
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
  },
  {
    title: "Salary Switcher: AED to INR — What Your Offer Really Means",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "Before you accept that AED 8,000 offer, run these numbers.",
    badges: [{ label: "Salary", tone: "green" }, { label: "UAE", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800",
  },
  {
    title: "How to Beat the LinkedIn ATS in 2024",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "LinkedIn's algorithm is different from job portal ATS. Here's how to optimise for both.",
    badges: [{ label: "LinkedIn", tone: "blue" }, { label: "ATS", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=800",
  },
  {
    title: "Banking Jobs in UAE: What ADIB and FAB Actually Want",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "Applied to 6 UAE banks. Here's what I learned about their hiring process.",
    badges: [{ label: "Banking", tone: "slate" }, { label: "UAE Jobs", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800",
  },
  {
    title: "Walk-In Interview Guide: Dubai 2024",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "Walk-in interviews are still a thing in Dubai. Here's how to show up and stand out.",
    badges: [{ label: "Interviews", tone: "orange" }, { label: "Dubai", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800",
  },
  {
    title: "Cover Letter for UAE Jobs: What Works in 2024",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "UAE recruiters read cover letters differently. This template gets responses.",
    badges: [{ label: "Cover Letter", tone: "pink" }, { label: "UAE", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=800",
  },
  {
    title: "Indian CV vs UAE CV: Key Differences",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "Your Indian CV format will get rejected in the UAE. Here's exactly what to change.",
    badges: [{ label: "CV Tips", tone: "green" }, { label: "India", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1586282391129-76a6df230234?w=800",
  },
  {
    title: "GCC Job Market 2024: Where the Opportunities Are",
    author: "Junaid Khan",
    date: "Sunday, 1 Jan 2024",
    excerpt: "Saudi, Qatar, Bahrain — which GCC market is hottest for Indian professionals right now.",
    badges: [{ label: "GCC", tone: "blue" }, { label: "Career", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
  },
];

function Badges({ items }) {
  return (
    <div className="blog-card__badges">
      {items.map((b) => (
        <span key={b.label} className={`blog-badge blog-badge--${b.tone}`}>{b.label}</span>
      ))}
    </div>
  );
}

function Card({ post, variant = "default" }) {
  if (variant === "horizontal") {
    return (
      <article className="blog-card blog-card--horizontal">
        <img src={post.image} alt="" className="blog-card__image" />
        <div className="blog-card__body">
          <p className="blog-card__meta">{post.author}&nbsp;&middot; {post.date}</p>
          <h3 className="blog-card__title">
            <span>{post.title}</span>
            <span className="blog-card__arrow" aria-hidden>↗</span>
          </h3>
          <p className="blog-card__excerpt">{post.excerpt}</p>
          <Badges items={post.badges} />
        </div>
      </article>
    );
  }
  return (
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
  );
}

function TogglePill({ className = "blog-nav__toggle" }) {
  return (
    <span className={className} aria-hidden>
      <span>☀︎</span>
      <span>☾</span>
    </span>
  );
}

export default function BlogPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const featured = POSTS[0];
  const stacked = [POSTS[1], POSTS[2]];
  const wide = POSTS[3];
  const rest = POSTS.slice(4);

  return (
    <div className="blog-page">
      {/* Navbar */}
      <nav className="blog-nav">
        <button className="blog-nav__logo" onClick={() => navigate("/")}>CVPassport</button>
        <div className="blog-nav__right">
          <div className="blog-nav__links">
            <button className="blog-nav__link is-active" type="button">Blog</button>
            <button className="blog-nav__link" type="button" onClick={() => navigate("/tools")}>Tools</button>
            <button className="blog-nav__link" type="button" onClick={() => navigate("/pricing")}>Pricing</button>
            <button className="blog-nav__link" type="button" onClick={() => navigate("/#newsletter")}>Newsletter</button>
          </div>
          <TogglePill />
        </div>
        <button
          className="blog-nav__hamburger"
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="7" x2="21" y2="7" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="17" x2="21" y2="17" />
          </svg>
        </button>
      </nav>

      {/* Hero */}
      <section className="blog-hero">
        <h1 className="blog-hero__title">THE BLOG</h1>
      </section>

      {/* Recent blog posts */}
      <section className="blog-section">
        <h2 className="blog-section__heading">Recent blog posts</h2>
        <div className="blog-recent-grid">
          <Card post={featured} />
          <div className="blog-recent-right">
            {stacked.map((p) => (
              <Card key={p.title} post={p} variant="horizontal" />
            ))}
          </div>
        </div>

        {/* Wide card */}
        <div className="blog-wide">
          <img src={wide.image} alt="" className="blog-wide__image" />
          <div className="blog-wide__body">
            <p className="blog-card__meta">{wide.author}&nbsp;&middot; {wide.date}</p>
            <h3 className="blog-card__title">
              <span>{wide.title}</span>
              <span className="blog-card__arrow" aria-hidden>↗</span>
            </h3>
            <p className="blog-card__excerpt">{wide.excerpt}</p>
            <Badges items={wide.badges} />
          </div>
        </div>
      </section>

      {/* All blog posts */}
      <section className="blog-section">
        <h2 className="blog-section__heading">All blog posts</h2>
        <div className="blog-all-grid">
          {rest.map((p) => (
            <Card key={p.title} post={p} />
          ))}
        </div>
      </section>

      {/* Pagination */}
      <div className="blog-pagination">
        <button className="blog-pagination__btn blog-pagination__btn--prev" type="button">
          <span aria-hidden>←</span> Previous
        </button>
        <div className="blog-pagination__pages">
          <button className="blog-pagination__page is-active" type="button">1</button>
          <button className="blog-pagination__page" type="button">2</button>
          <button className="blog-pagination__page" type="button">3</button>
          <span className="blog-pagination__dots">…</span>
          <button className="blog-pagination__page" type="button">8</button>
          <button className="blog-pagination__page" type="button">9</button>
          <button className="blog-pagination__page" type="button">10</button>
        </div>
        <button className="blog-pagination__btn blog-pagination__btn--next" type="button">
          Next <span aria-hidden>→</span>
        </button>
      </div>

      {/* Newsletter */}
      <section className="blog-newsletter" id="newsletter">
        <p className="blog-newsletter__label">Newsletter</p>
        <h2 className="blog-newsletter__title">Stories and interviews</h2>
        <p className="blog-newsletter__subtitle">
          Subscribe to learn about CV hacks, ATS insights, and Gulf-market
          hiring signals from CVPassport.
        </p>
        <form
          className="blog-newsletter__form"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <input
            className="blog-newsletter__input"
            type="email"
            placeholder="Enter your email"
            required
          />
          <button className="blog-newsletter__submit" type="submit">Subscribe</button>
        </form>
        <p className="blog-newsletter__privacy">
          We care about your data in our <a href="/privacy">privacy&nbsp;policy</a>.
        </p>
      </section>

      {/* Footer */}
      <footer className="blog-footer">
        <span>© 2024 CVPassport</span>
        <div className="blog-footer__links">
          <a className="blog-footer__link" href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a>
          <a className="blog-footer__link" href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="blog-footer__link" href="mailto:noreply@mycvpassport.com">Email</a>
          <a className="blog-footer__link" href="/rss.xml">RSS feed</a>
          <a className="blog-footer__link" href="https://feedly.com">Add to Feedly</a>
        </div>
      </footer>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="blog-mobile-menu" role="dialog" aria-modal="true">
          <div className="blog-mobile-menu__logo">CVPassport</div>
          <button className="blog-mobile-menu__link" type="button" onClick={() => setMenuOpen(false)}>Blog</button>
          <button className="blog-mobile-menu__link" type="button" onClick={() => { setMenuOpen(false); navigate("/tools"); }}>Tools</button>
          <button className="blog-mobile-menu__link" type="button" onClick={() => { setMenuOpen(false); navigate("/pricing"); }}>Pricing</button>
          <button className="blog-mobile-menu__link" type="button" onClick={() => setMenuOpen(false)}>Newsletter</button>
          <TogglePill className="blog-mobile-menu__toggle" />
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
