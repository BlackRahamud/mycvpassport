import { useState } from "react";
import { supabase } from "../../appSupabaseClient";

/* "View original CV" — opens the candidate's uploaded file (PDF/DOCX with
   their photo + original layout) in a new tab via a short-lived signed URL.

   The file lives in the private applicant-cvs bucket; we never expose a
   public URL. On click we ask Storage for a signed URL (RLS confirms this
   HR owns the application that points at the file), then open it. The link
   expires in 5 minutes, so a copied URL stops working shortly after.

   Renders nothing when there is no uploaded file — easy-apply candidates
   who built their CV on CVPassport have only the parsed view. */

const FileIc = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const SIGNED_URL_TTL_SECONDS = 300; // 5 minutes

export default function ViewOriginalCv({ path }) {
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!path) return null;

  const open = async () => {
    if (!supabase || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const { data, error } = await supabase.storage
        .from("applicant-cvs")
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (error || !data?.signedUrl) throw error || new Error("No signed URL");
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      console.error("View original CV failed:", e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      className="jpp-action jpp-action--ghost"
      onClick={open}
      disabled={loading}
      aria-busy={loading}
    >
      <FileIc />
      {loading ? "Opening…" : failed ? "Couldn't open — retry" : "View original CV"}
    </button>
  );
}
