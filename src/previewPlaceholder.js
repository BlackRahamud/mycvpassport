/**
 * Placeholder text treatment for the live preview.
 *
 * The document must look real from second zero: template styling (navy
 * headings, rules, accents) renders at FULL fidelity always; only the
 * placeholder CONTENT is muted-but-legible. When the user fills a field
 * the same span flips from .cvp-ph to .cvp-ph-real and the opacity
 * crossfades over 150ms (CSS; instant under reduced motion).
 *
 * The classes also exist in the print wrapper CSS
 * (src/downloadResumeFromPreview.js) so an exported unfinished CV mutes
 * its placeholders exactly like the preview does.
 */
export function ph(value, fallback) {
  const has = value != null && String(value).trim() !== "";
  return (
    <span className={has ? "cvp-ph-real" : "cvp-ph"}>{has ? value : fallback}</span>
  );
}
