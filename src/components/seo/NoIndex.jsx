import { Helmet } from "react-helmet-async";

/**
 * Drop into any authed/app-only surface so it never pollutes the Google
 * index (builder, dashboard, employer portal internals, auth flows).
 * Pages carrying this must NOT be robots.txt-disallowed — the crawler has
 * to fetch the page to see the noindex.
 */
export default function NoIndex() {
  return (
    <Helmet>
      <meta name="robots" content="noindex" />
    </Helmet>
  );
}
