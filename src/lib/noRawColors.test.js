/**
 * Theme-token gate — CI guard for the light-default migration.
 *
 * Files migrated to semantic tokens must never regress to raw white /
 * dark-surface color literals: white text is invisible on the light
 * default, hardcoded dark surfaces break the theme flip. New landing /
 * auth / marketing components should be added to GATE_FILES as they are
 * migrated.
 *
 * Escape hatch: a line carrying the `theme-fixed` marker declares an
 * INTENTIONAL fixed color (e.g. a white label on an amber gradient fill
 * that must not flip with the theme).
 *
 * Deliberately NOT gated: CV templates (user documents, never themed),
 * dark-pinned islands (builder, ATS, scout — they carry
 * data-theme="dark" until migrated), LandingPage.jsx (its T object is a
 * dual palette by construction), HowItWorks.jsx (phone mockup internals
 * are dark hardware by design).
 */
const fs = require("fs");
const path = require("path");

const GATE_FILES = [
  "src/components/landing/HeroSection.jsx",
  "src/components/landing/AtsScoreLiftBanner.jsx",
  "src/components/marketing/TestimonialsRow.jsx",
  "src/components/CookieBanner.jsx",
  "src/pages/AuthPage.jsx",
  "src/pages/ResetPassword.jsx",
  "src/pages/AuthCallback.jsx",
  "src/pages/PricingPage.jsx",
];

// White-ish literals (invisible on light bg) + the dark surface set
// (breaks the flip when hardcoded).
const FORBIDDEN = /#fff\b|#FFF\b|#ffffff|#FFFFFF|#F5F5F7|#f5f5f7|#e8e8e8|#E5E5E5|rgba\(\s*255\s*,\s*255\s*,\s*255|#0A0A0A|#0a0a0a|#141414|#1C1C1C|#1c1c1c|#161616|#1a1a1a|#A0A0A0|#a0a0a0/;

// Lines that legitimately contain white-alpha values without painting
// text/surfaces: masks (alpha channels), shadows/glows, insets.
const LINE_EXEMPT = /theme-fixed|[Mm]ask|box-shadow|boxShadow|drop-shadow|inset/;

describe("no raw dark/white color literals in theme-migrated files", () => {
  GATE_FILES.forEach((rel) => {
    test(rel, () => {
      const full = path.join(process.cwd(), rel);
      const lines = fs.readFileSync(full, "utf8").split(/\r?\n/);
      const offenders = [];
      lines.forEach((line, i) => {
        if (LINE_EXEMPT.test(line)) return;
        if (FORBIDDEN.test(line)) offenders.push(`${rel}:${i + 1} → ${line.trim()}`);
      });
      expect(offenders).toEqual([]);
    });
  });
});
