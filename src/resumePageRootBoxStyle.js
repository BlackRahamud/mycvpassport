/**
 * Outermost CV preview root — box aligned with Template 1 (Gulf Classic / PreviewBanner)
 * for consistent A4 PDF output. Merge with template-specific colors, fontFamily, color,
 * fontSize, and layout (flex/grid).
 */
export function resumePageRootBoxStyle(mobileMode) {
  return {
    borderRadius: "10px",
    overflow: "hidden",
    width: mobileMode ? "100%" : undefined,
    maxWidth: mobileMode ? "100%" : undefined,
    transform: "none",
  };
}
