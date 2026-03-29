import { Navigate } from "react-router-dom";

/** Deep-link to dashboard with FAB account tab (same as mobile tab bar Account). */
export default function AccountPage() {
  return <Navigate to="/dashboard" replace state={{ fabGuideTab: "account" }} />;
}
