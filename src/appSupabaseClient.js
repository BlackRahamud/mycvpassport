import { supabase as supabaseImport } from "./supabaseClient";

const isPrerender = typeof navigator !== "undefined" && navigator.userAgent.includes("ReactSnap");

export const supabase = isPrerender ? null : supabaseImport;
