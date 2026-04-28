import { Navigate } from "react-router-dom";

// Drop-in replacement for `<Navigate to="/auth" replace />` on protected
// routes. Stashes the current pathname in sessionStorage under the
// `cvp_return_path` key before handing off to the real Navigate, so the
// post-auth redirect in useCvpAuth can land the user back on whatever
// page they were trying to reach (e.g. /scout) instead of the generic
// /dashboard. The capture is intentionally done at render time rather
// than in useEffect — by the time an effect would fire, react-router has
// already replaced the URL with /auth and we'd lose the original path.
const RETURN_PATH_KEY = "cvp_return_path";

export default function NavigateToAuth() {
  if (typeof window !== "undefined" && window.sessionStorage) {
    try {
      const path = window.location.pathname;
      if (path && path !== "/auth" && path !== "/") {
        window.sessionStorage.setItem(RETURN_PATH_KEY, path);
      }
    } catch {
      /* private mode etc. — fail silently, user just lands on /dashboard */
    }
  }
  return <Navigate to="/auth" replace />;
}
