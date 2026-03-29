import { ANON_DOWNLOADS_KEY } from "./components/FAB/FABLogic";
import { supabase } from "./appSupabaseClient";
import { cvWithTemplateCertifications } from "./cvShared";

/** Full HTML document for iLovePDF (fonts + A4 preview shell; mirrors index.css .cvp-builder-a4-fit desktop rules). */
function buildCvPdfHtmlDocument(cvFragmentHtml) {
  const style = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #ffffff; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .cvp-builder-a4-fit {
      background: #ffffff;
      width: 794px;
      min-height: unset;
      height: auto;
      padding: 32px;
      border-radius: 8px;
      box-shadow: none;
      box-sizing: border-box;
    }
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"/>
<style>${style}</style>
</head>
<body>
${cvFragmentHtml}
</body>
</html>`;
}

// ─── PDF DOWNLOAD — iLovePDF API (A4) from live preview HTML ───────────────────
export async function downloadResumeFromPreview(cvInput, captureElement) {
  const cv = cvWithTemplateCertifications(cvInput);
  if (!captureElement) throw new Error("Preview not ready");

  const cvElement = captureElement.classList.contains("cvp-builder-a4-fit")
    ? captureElement
    : captureElement.querySelector(".cvp-builder-a4-fit");
  if (!cvElement) throw new Error("Preview not ready");

  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready.catch(() => {});
  }

  const html = buildCvPdfHtmlDocument(cvElement.outerHTML);
  const baseName = `${(cv.name || "Resume").replace(/\s+/g, "_")}_CVPassport`;

  const res = await fetch(`${window.location.origin}/api/generate-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ html, filename: baseName }),
  });
  if (!res.ok) {
    let msg = `Server error ${res.status}`;
    try {
      const j = await res.json();
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${baseName}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { error } = await supabase.from("downloads").insert([{ user_id: user.id }]);
      if (error) console.error("Error tracking download:", error);
    } else {
      try {
        if (typeof localStorage !== "undefined") {
          const cur = parseInt(localStorage.getItem(ANON_DOWNLOADS_KEY) || "0", 10) || 0;
          localStorage.setItem(ANON_DOWNLOADS_KEY, String(cur + 1));
        }
      } catch {
        /* ignore */
      }
    }
  }
}
