import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import POSTS from "../data/posts";
import { BlogNav, CtaBand, BlogFooter, Reveal } from "./BlogChrome";
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

function renderBlock(block, i) {
  switch (block.type) {
    case "h2":
      return <h2 key={i} className="blog-post__h2">{block.text}</h2>;
    case "h3":
      return <h3 key={i} className="blog-post__h3">{block.text}</h3>;
    case "quote":
      return <blockquote key={i} className="blog-post__quote">{renderInline(block.text)}</blockquote>;
    case "ul":
      return (
        <ul key={i} className="blog-post__ul">
          {block.items.map((it, j) => <li key={j}>{renderInline(it)}</li>)}
        </ul>
      );
    case "table":
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
    case "cta":
      return (
        <p key={i} className="blog-post__cta-row">
          <Link to={block.href} className="blog-post__cta-inline">{block.label}</Link>
        </p>
      );
    case "hr":
      return <hr key={i} className="blog-post__hr" />;
    default:
      return <p key={i}>{renderInline(block.text)}</p>;
  }
}

function NotFound() {
  return (
    <div className="blog-page blog-post-page">
      <BlogNav active="/blog" />
      <div className="blog-post__notfound">
        <h1>Post not found</h1>
        <p>This article doesn&rsquo;t exist, or the link is mistyped.</p>
        <Link to="/blog" className="blog-post__back">← Back to Blog</Link>
      </div>
      <BlogFooter />
    </div>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams();

  const idx = POSTS.findIndex((p) => p.slug === slug);
  if (idx === -1) return <NotFound />;

  const post = POSTS[idx];
  const prev = idx > 0 ? POSTS[idx - 1] : null;
  const next = idx < POSTS.length - 1 ? POSTS[idx + 1] : null;

  const canonical = `https://www.mycvpassport.com/blog/${post.slug}`;
  const metaTitle = post.metaTitle || `${post.title} | CVPassport`;
  const metaDesc = post.metaDescription || post.excerpt;
  // A post without a body is a stub ("coming soon"). Stubs are noindexed
  // until written — thin placeholder pages in the index are an SEO and
  // trust liability — and they must not claim a read time they don't have.
  const isStub = !post.body || post.body.length === 0;

  return (
    <div className="blog-page blog-post-page">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        {isStub && <meta name="robots" content="noindex" />}
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

      <BlogNav active="/blog" />

      <article className="blog-post">
        <Reveal className="blog-post__header" as="header">
          <span className="blog-post__eyebrow">{post.category}</span>
          <h1 className="blog-post__title">{post.title}</h1>
          <p className="blog-post__meta-row">
            <span>{post.date}</span>
            <span className="blog-post__meta-sep" aria-hidden>·</span>
            <span>{post.author}</span>
            {post.readTime && !isStub && (
              <>
                <span className="blog-post__meta-sep" aria-hidden>·</span>
                <span>{post.readTime}</span>
              </>
            )}
          </p>
        </Reveal>

        {post.image && (
          <img src={post.image} alt={post.title} className="blog-post__hero" />
        )}

        <div className="blog-post__body">
          <p className="blog-post__lead">{post.excerpt}</p>
          {post.body
            ? post.body.map((block, i) => renderBlock(block, i))
            : (
              <p>
                Full article coming soon. In the meantime, the summary above
                captures the key takeaway.
              </p>
            )}
        </div>

        <Link to="/blog" className="blog-post__back">← Back to Blog</Link>

        {(prev || next) && (
          <nav className="blog-post__pn" aria-label="More posts">
            {prev ? (
              <Link to={`/blog/${prev.slug}`} className="blog-post__pn-link blog-post__pn-link--prev">
                <span className="blog-post__pn-dir">← Previous</span>
                <span className="blog-post__pn-title">{prev.title}</span>
              </Link>
            ) : <span />}
            {next ? (
              <Link to={`/blog/${next.slug}`} className="blog-post__pn-link blog-post__pn-link--next">
                <span className="blog-post__pn-dir">Next →</span>
                <span className="blog-post__pn-title">{next.title}</span>
              </Link>
            ) : <span />}
          </nav>
        )}
      </article>

      <CtaBand
        title="Ready to build your Gulf-ready CV?"
        primaryLabel="Build my CV free"
        secondaryLabel="Check my ATS score"
      />
      <BlogFooter />
    </div>
  );
}
