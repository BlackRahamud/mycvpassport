// =============================================================
// cvFile — the verified open path for original applicant CVs.
//
// Fetches the file bytes through the AUTHENTICATED Storage API
// (`download()`), never by pointing an embed at a signed URL: RLS confirms
// the recruiter owns the application pointing at the file, popup blockers
// and third-party-cookie rules never see a cross-origin URL, and the blob
// is re-typed from the path extension so legacy uploads stored as
// application/octet-stream render inline instead of downloading.
//
// Signed URLs are still minted for the Download / open-in-new-tab anchors
// (plain <a> — always inside the user's gesture). If minting fails the
// caller falls back to the blob URL, so those anchors never go dead.
// =============================================================
import { supabase } from "../../appSupabaseClient";

const SIGNED_URL_TTL = 300; // 5 minutes

export const MIME_BY_EXT = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function fileExt(path) {
  const base = (path || "").split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  return dot > -1 ? base.slice(dot + 1).toLowerCase() : "";
}

/* Blob.arrayBuffer() is missing in Safari <14 (and jsdom) — fall back to
   FileReader so the render path never dies on an older browser. */
export function blobToArrayBuffer(blob) {
  if (typeof blob.arrayBuffer === "function") return blob.arrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Blob read failed"));
    reader.readAsArrayBuffer(blob);
  });
}

export async function loadCvFile(path) {
  const store = supabase.storage.from("applicant-cvs");
  const ext = fileExt(path);

  const [file, inline, dl] = await Promise.all([
    store.download(path),
    store.createSignedUrl(path, SIGNED_URL_TTL),
    store.createSignedUrl(path, SIGNED_URL_TTL, { download: true }),
  ]);
  if (file.error || !file.data) throw file.error || new Error("Storage download returned no data");

  const mime = MIME_BY_EXT[ext] || file.data.type || "application/octet-stream";
  const blob = file.data.type === mime ? file.data : new Blob([file.data], { type: mime });

  return {
    blob,
    ext,
    tabUrl: inline.data?.signedUrl || null,
    downloadUrl: dl.data?.signedUrl || null,
  };
}
