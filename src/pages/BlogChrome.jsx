/**
 * Shared chrome for the CVPassport /blog surface.
 *
 * One home for the sticky nav, the espresso CTA band, the mega-footer, and the
 * shared motion primitives — imported by both BlogPage (index) and
 * BlogPostPage (article). Keeps the two pages from re-declaring the same nav
 * and footer markup. All styling lives in BlogPage.css.
 *
 * Design language mirrors webclaw.io's blog (Instrument Serif display over
 * Geist / Geist Mono) repainted in the warm CVPassport palette.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Menu, X } from "lucide-react";

// House easings lifted from webclaw's CSS bundle.
export const EASE_RISE = [0.16, 0.84, 0.3, 1]; // .85s content rise-and-fade
export const EASE_SNAP = [0.2, 0.9, 0.3, 1]; // .12–.22s UI micro-interactions

/**
 * Rise-and-fade reveal: translateY(18px) → 0, opacity 0 → 1 over .85s.
 * Honours prefers-reduced-motion by rendering a plain element with no motion.
 */
export function Reveal({ children, className, as = "div", delay = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }
  const M = motion[as] || motion.div;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.85, ease: EASE_RISE, delay }}
    >
      {children}
    </M>
  );
}

const NAV_LINKS = [
  { label: "Blog", to: "/blog" },
  { label: "Tools", to: "/tools" },
  { label: "Pricing", to: "/pricing" },
  { label: "Templates", to: "/templates" },
];

/** Sticky top nav — logo left, links centre, amber CTA right; self-contained mobile menu. */
export function BlogNav({ active = "/blog" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="blog-nav">
        <Link className="blog-nav__logo" to="/">CVPassport</Link>

        <div className="blog-nav__links">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              className={`blog-nav__link${l.to === active ? " is-active" : ""}`}
              to={l.to}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <Link className="blog-nav__cta" to="/builder">Build my CV</Link>

        <button
          className="blog-nav__hamburger"
          type="button"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
        >
          <Menu size={22} aria-hidden />
        </button>
      </nav>

      {open && (
        <div className="blog-mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <span className="blog-mobile-menu__logo">CVPassport</span>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.to}
              className="blog-mobile-menu__link"
              to={l.to}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <Link className="blog-mobile-menu__cta" to="/builder" onClick={() => setOpen(false)}>
            Build my CV
          </Link>
          <button
            className="blog-mobile-menu__close"
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={26} aria-hidden />
          </button>
        </div>
      )}
    </>
  );
}

/** Espresso conversion band — serif headline + amber primary + teal secondary link. */
export function CtaBand({
  title = "Build a CV the Gulf actually reads.",
  primaryLabel = "Build my CV free",
  primaryHref = "/builder",
  secondaryLabel = "Check my ATS score",
  secondaryHref = "/ats",
}) {
  return (
    <section className="blog-cta-band">
      <Reveal className="blog-cta-band__inner">
        <h2 className="blog-cta-band__title">{title}</h2>
        <div className="blog-cta-band__actions">
          <Link className="blog-cta-band__primary" to={primaryHref}>{primaryLabel}</Link>
          <Link className="blog-cta-band__secondary" to={secondaryHref}>
            {secondaryLabel} <span aria-hidden>→</span>
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

/** Espresso mega-footer — Product / Resources / Company columns + bottom bar. */
export function BlogFooter() {
  return (
    <footer className="blog-footer">
      <div className="blog-footer__cols">
        <div className="blog-footer__brand">
          <Link className="blog-footer__logo" to="/">CVPassport</Link>
          <p className="blog-footer__tag">
            ATS engineered CVs for the India to Gulf hiring corridor.
          </p>
        </div>

        <nav className="blog-footer__col" aria-label="Product">
          <p className="blog-footer__heading">Product</p>
          <Link className="blog-footer__link" to="/builder">CV Builder</Link>
          <Link className="blog-footer__link" to="/ats">ATS Checker</Link>
          <Link className="blog-footer__link" to="/templates">Templates</Link>
          <Link className="blog-footer__link" to="/pricing">Pricing</Link>
        </nav>

        <nav className="blog-footer__col" aria-label="Resources">
          <p className="blog-footer__heading">Resources</p>
          <Link className="blog-footer__link" to="/blog">Blog</Link>
          <Link className="blog-footer__link" to="/tools">Tools</Link>
          <Link className="blog-footer__link" to="/cover-letter">Cover Letter</Link>
          <Link className="blog-footer__link" to="/about">About</Link>
        </nav>

        <nav className="blog-footer__col" aria-label="Company">
          <p className="blog-footer__heading">Company</p>
          <Link className="blog-footer__link" to="/about">About</Link>
          <Link className="blog-footer__link" to="/privacy">Privacy</Link>
          <a className="blog-footer__link" href="mailto:noreply@mycvpassport.com">Contact</a>
        </nav>
      </div>

      <div className="blog-footer__bottom">
        <span>© 2026 CVPassport</span>
        <div className="blog-footer__social">
          <a className="blog-footer__link" href="https://twitter.com" target="_blank" rel="noreferrer">Twitter</a>
          <a className="blog-footer__link" href="https://linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="blog-footer__link" href="/rss.xml">RSS</a>
        </div>
      </div>
    </footer>
  );
}
