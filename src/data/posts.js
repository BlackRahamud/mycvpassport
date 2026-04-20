/**
 * Blog posts for CVPassport.
 *
 * Single source of truth — imported by both src/pages/BlogPage.jsx (the index
 * grid) and src/pages/BlogPostPage.jsx (individual article routed at
 * /blog/:slug). To add a post, append an object here; the slug is derived
 * from the title automatically.
 */

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const rawPosts = [
  {
    title: "Should You Put Passport Details on Your UAE CV?",
    author: "@CVPassportTeam",
    date: "Monday, 3 Feb 2026",
    readTime: "4 min read",
    category: "UAE Jobs",
    excerpt: "Most Indian professionals make this mistake on their UAE CV. Here's what ATS systems actually want.",
    badges: [{ label: "UAE Jobs", tone: "purple" }, { label: "ATS Tips", tone: "blue" }],
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
  },
  {
    title: "ATS Score Guide for GCC Jobs: What Recruiters See",
    author: "@CVPassportTeam",
    date: "Wednesday, 12 Feb 2026",
    readTime: "6 min read",
    category: "ATS",
    excerpt: "We scanned 500 CVs through UAE ATS systems. Here's exactly what kills your score.",
    badges: [{ label: "ATS", tone: "purple" }, { label: "Research", tone: "pink" }],
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
  },
  {
    title: "Salary Switcher: AED to INR — What Your Offer Really Means",
    author: "@CVPassportTeam",
    date: "Sunday, 22 Feb 2026",
    readTime: "5 min read",
    category: "Salary",
    excerpt: "Before you accept that AED 8,000 offer, run these numbers.",
    badges: [{ label: "Salary", tone: "green" }, { label: "UAE", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800",
  },
  {
    title: "How to Beat the LinkedIn ATS in 2024",
    author: "@CVPassportTeam",
    date: "Friday, 6 Mar 2026",
    readTime: "5 min read",
    category: "LinkedIn",
    excerpt: "LinkedIn's algorithm is different from job portal ATS. Here's how to optimise for both.",
    badges: [{ label: "LinkedIn", tone: "blue" }, { label: "ATS", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=800",
  },
  {
    title: "Banking Jobs in UAE: What ADIB and FAB Actually Want",
    author: "@CVPassportTeam",
    date: "Tuesday, 17 Mar 2026",
    readTime: "7 min read",
    category: "Banking",
    excerpt: "Applied to 6 UAE banks. Here's what I learned about their hiring process.",
    badges: [{ label: "Banking", tone: "slate" }, { label: "UAE Jobs", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800",
  },
  {
    title: "Walk-In Interview Guide: Dubai 2024",
    author: "@CVPassportTeam",
    date: "Saturday, 28 Mar 2026",
    readTime: "5 min read",
    category: "Interviews",
    excerpt: "Walk-in interviews are still a thing in Dubai. Here's how to show up and stand out.",
    badges: [{ label: "Interviews", tone: "orange" }, { label: "Dubai", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800",
  },
  {
    title: "Cover Letter for UAE Jobs: What Works in 2024",
    author: "@CVPassportTeam",
    date: "Wednesday, 1 Apr 2026",
    readTime: "4 min read",
    category: "Cover Letter",
    excerpt: "UAE recruiters read cover letters differently. This template gets responses.",
    badges: [{ label: "Cover Letter", tone: "pink" }, { label: "UAE", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=800",
  },
  {
    title: "Indian CV vs UAE CV: Key Differences",
    author: "@CVPassportTeam",
    date: "Sunday, 12 Apr 2026",
    readTime: "6 min read",
    category: "CV Tips",
    excerpt: "Your Indian CV format will get rejected in the UAE. Here's exactly what to change.",
    badges: [{ label: "CV Tips", tone: "green" }, { label: "India", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1586282391129-76a6df230234?w=800",
  },
  {
    title: "GCC Job Market 2024: Where the Opportunities Are",
    author: "@CVPassportTeam",
    date: "Friday, 18 Apr 2026",
    readTime: "8 min read",
    category: "GCC",
    excerpt: "Saudi, Qatar, Bahrain — which GCC market is hottest for Indian professionals right now.",
    badges: [{ label: "GCC", tone: "blue" }, { label: "Career", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
  },
];

const posts = rawPosts.map((p) => ({ ...p, slug: slugify(p.title) }));

export default posts;
