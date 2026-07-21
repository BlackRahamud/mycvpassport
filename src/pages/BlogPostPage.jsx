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
    // Inline supporting art. Lazy loaded because it sits below the fold,
    // and width/height are set so the browser reserves the space and the
    // text does not jump when it arrives.
    case "image":
      return (
        <figure key={i} className="blog-post__figure">
          <img
            src={block.src}
            alt={block.alt}
            width={block.width || 1200}
            height={block.height || 800}
            loading="lazy"
            decoding="async"
            className="blog-post__figure-img"
          />
          {block.caption && <figcaption className="blog-post__figure-cap">{block.caption}</figcaption>}
        </figure>
      );
    case "hr":
      return <hr key={i} className="blog-post__hr" />;
    default:
      return <p key={i}>{renderInline(block.text)}</p>;
  }
}

// "Thursday, 2 Jul 2026" → "2026-07-02" (ISO date for JSON-LD). Returns
// null on anything unparseable so we omit the field rather than lie.
function postDateToISO(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/^[A-Za-z]+,\s*/, "");
  const d = new Date(cleaned);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Strip the body-block markdown (**bold**, [label](href)) for plain-text
// JSON-LD values.
function plainText(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

// Pull Q/A pairs out of the body's "Frequently Asked Questions" section:
// each h3 is a question, the paragraphs until the next h3/h2/hr are its
// answer. Returns [] when the article has no FAQ section.
function extractFaq(body) {
  if (!body) return [];
  const start = body.findIndex(
    (b) => b.type === "h2" && /frequently asked/i.test(b.text || ""),
  );
  if (start === -1) return [];
  const faqs = [];
  let question = null;
  let answer = [];
  const flush = () => {
    if (question && answer.length) {
      faqs.push({ question, answer: answer.join(" ") });
    }
    question = null;
    answer = [];
  };
  for (let i = start + 1; i < body.length; i++) {
    const b = body[i];
    if (b.type === "h2" || b.type === "hr") break;
    if (b.type === "h3") {
      flush();
      question = plainText(b.text);
    } else if (b.type === "p" && question) {
      answer.push(plainText(b.text));
    }
  }
  flush();
  return faqs;
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
  // og:image and twitter:image must be ABSOLUTE. Posts that ship their
  // art from public/ carry a root relative path, and a social crawler
  // given "/assets/..." simply fails to fetch it, so the card renders
  // with no image. Remote images (the older posts) already are absolute.
  const ogImage = post.image
    ? (post.image.startsWith("http") ? post.image : `https://www.mycvpassport.com${post.image}`)
    : null;
  // A post without a body is a stub ("coming soon"). Stubs are noindexed
  // until written — thin placeholder pages in the index are an SEO and
  // trust liability — and they must not claim a read time they don't have.
  const isStub = !post.body || post.body.length === 0;

  // JSON-LD: Article schema on every written post, FAQPage where the body
  // carries a Frequently Asked Questions section. Stubs get neither.
  const isoDate = postDateToISO(post.date);
  const articleLd = !isStub
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: metaDesc,
        ...(ogImage ? { image: [ogImage] } : {}),
        ...(isoDate ? { datePublished: isoDate, dateModified: isoDate } : {}),
        author: { "@type": "Organization", name: "CVPassport", url: "https://www.mycvpassport.com/about" },
        publisher: {
          "@type": "Organization",
          name: "CVPassport",
          logo: { "@type": "ImageObject", url: "https://www.mycvpassport.com/logo192.png" },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
      }
    : null;
  const faqs = isStub ? [] : extractFaq(post.body);
  const faqLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <div className="blog-page blog-post-page">
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDesc} />
        {post.keywords && <meta name="keywords" content={post.keywords.join(", ")} />}
        <link rel="canonical" href={canonical} />
        {isStub && <meta name="robots" content="noindex" />}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:url" content={canonical} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDesc} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        {articleLd && (
          <script type="application/ld+json">{JSON.stringify(articleLd)}</script>
        )}
        {faqLd && (
          <script type="application/ld+json">{JSON.stringify(faqLd)}</script>
        )}
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
