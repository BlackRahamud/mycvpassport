/**
 * Upload a job-description image straight to Supabase Storage (public
 * "job-assets" bucket) and return its public URL. No Vercel function —
 * browser → Storage SDK direct. The editor inserts the URL as an <img>,
 * never base64.
 *
 * Guardrails: image types only, 5 MB max. Path = {hr_uid}/{ts}-{rand}.{ext}
 * so the bucket's INSERT RLS (first folder segment = auth.uid()) passes.
 */
import { supabase } from "../appSupabaseClient";

export const JOB_IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

export async function uploadJobImage(file) {
  if (!file) throw new Error("No file selected.");
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Please choose a PNG, JPG, WebP, or GIF image.");
  }
  if (file.size > JOB_IMAGE_MAX_BYTES) {
    throw new Error("That image is over 5 MB — please pick a smaller one.");
  }

  const { data: { user } = {} } = await supabase.auth.getUser();
  if (!user?.id) throw new Error("Please sign in to upload an image.");

  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${user.id}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

  const { error } = await supabase.storage
    .from("job-assets")
    .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw new Error(error.message || "Upload failed. Please try again.");

  const { data } = supabase.storage.from("job-assets").getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Couldn't get the image URL. Please try again.");
  return data.publicUrl;
}
