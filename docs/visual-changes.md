# Visual changes — CV-only result page (sprint: OLED restore)

*2026-04-28. Three visual upgrades on `/ats` when the user uploads a CV without a JD (or with a JD < 50 chars). Files: `src/components/CvOnlyResult.jsx`, `src/components/ScannerRing.jsx` (new).*

I work in a CLI without a browser, so no screenshots are attached. This doc describes the changes pixel-by-pixel and lists the manual verification steps you'll run once the deploy lands.

---

## Priority 1 — OLED scanner ring on the score badge

### Before
- 96×96 px circle with a static 2 px border in `getScoreColor(score)`.
- Score number rendered inline at 32 px / 800 weight.
- 9 px "HEALTH" caption underneath, no verdict label.
- No animation. No glow.

### After (new `ScannerRing` component, 180 px wide)
- 5 layers, bottom to top:
  1. **Pulsing glow halo** — separate underlay div with `box-shadow: 0 0 28px 4px <band hex @ 55%>`, animates `opacity 0.55 → 1 → 0.55` over 2 s ease-in-out infinite. Sits beneath everything so the inner content stays at full opacity.
  2. **Track ring** — full SVG circle, stroke at 8 % alpha of the band color, 14 px stroke width.
  3. **Animated progress arc** — SVG `circle` using `stroke-dasharray` + `stroke-dashoffset`. Animates from `display=0` to `display=score` via a 1.2 s `requestAnimationFrame` ease-out cubic count-up. `strokeLinecap: round` for soft edges. `transform: rotate(-90deg)` so the arc starts at 12 o'clock.
  4. **Rotating scanner sweep** — div with conic-gradient `from var(--scanner-angle), transparent 70% → band@60% 88% → band 100%`, masked to a ring shape. Animation drives `--scanner-angle` 0° → 360° over 4 s linear infinite. The leading edge brightens to full band color, the tail fades to transparent — gives the OLED-radar effect. Has its own `drop-shadow(0 0 8px <band@70%>)`.
  5. **Centre number + label** — band-coloured `score` at 57.6 px (32 % of size), `tabular-nums`, `text-shadow: 0 0 16px <band@40%>`. Below: 9 px HEALTH caption, then 10 px verdict ("Market ready" / "On track" / "Needs work").

- **Color bands (matches the spec exactly):**
  | Score | Hex | Label |
  | --- | --- | --- |
  | ≥ 85 | `#10b981` (emerald) | Market ready |
  | 60-84 | `#f59e0b` (amber) | On track |
  | < 60 | `#ef4444` (red) | Needs work |

- **Outer SVG** has `filter: drop-shadow(0 0 12px <band@45%>)` always-on for depth.

- **`prefers-reduced-motion: reduce`**: scanner doesn't rotate, glow doesn't pulse, progress fills instantly to final score. Static ring + correct color still rendered. Verified via the matched CSS media query inside the component's local `<style>` tag.

- **Reuses CV-section padding** to centre the ring vertically; section padding bumped from `24px 24px 20px` to `32px 24px 28px` to fit the larger ring.

---

## Priority 2 — Severity OLED glow on structure-issue cards

### Before
- Plain dark card: `background: T.elevated`, `border: 1px solid T.border`.
- Severity badge ("HIGH" / "MEDIUM" / "LOW") in muted/amber/red text, no glow.
- No left-edge accent. No box-shadow.

### After (new `SeverityIssueCard` component)
- **Left border** 2 px solid in severity color.
- **Box-shadow** combines:
  - `inset 4px 0 0 <severity@16%>` — inner left bar.
  - `0 0 12px <severity@45%>` — outer 12 px blur halo.
  - Both live on a positioned overlay div with `cvp-issue-glow` class, animating `opacity 0.45 → 0.95 → 0.45` over 2.5 s ease-in-out infinite. Pulse hits the glow only, not the card content.
- **Severity badge text** has `text-shadow: 0 0 6px <severity@55%>` so the label glows at the same hue.
- Card content sits above the glow underlay via `position: relative` so text never blurs.
- **40 ms stagger entrance** via framer-motion `transition.delay = index * 0.04`, fade + 8 px slide-up.

- **Colors (matches spec):**
  | Weight | Hex |
  | --- | --- |
  | high | `#ef4444` (red) |
  | medium | `#f59e0b` (amber) |
  | low | `#06b6d4` (cyan) |

- **`prefers-reduced-motion`**: pulse animation disabled, glow pinned at 0.6 opacity, stagger entrance disabled.

---

## Priority 3 — Color-coded skill pills with stagger

### Before
- All skill chips identical: `T.elevated` background, `T.border` border, white text, 13 px / 500 weight.

### After (new `SkillPill` component)
- Each skill is bucketed by keyword match (first-match-wins) into one of seven categories with the spec colors:
  | Category | Hex | Trigger keywords (sample) |
  | --- | --- | --- |
  | Security | `#f43f5e` rose | security, cyber, oauth, ssl, owasp, firewall, … |
  | Networking | `#10b981` emerald | tcp/ip, dns, vpn, ccna, cisco, vlan, … |
  | OS / infra | `#6366f1` indigo | linux, kubernetes, docker, aws, kafka, postgres, … |
  | Hardware | `#f97316` orange | welding, ndt, hvac, asme, electrician, iti, … |
  | Tools / SaaS | `#06b6d4` cyan | figma, slack, jira, salesforce, opera pms, sap, … |
  | Soft skills | `#a855f7` violet | leadership, teamwork, negotiation, … |
  | Default | `#64748b` slate | fallback when nothing matches |
- **Pill style:**
  - Background: `linear-gradient(135deg, <cat@12%> 0%, <cat@4%> 100%)`.
  - Border: `1px solid <cat@35%>`.
  - Text: `<cat@95%>`, 13 px, 600 weight.
  - Padding: 6 px / 13 px.
  - Border-radius: 999 px (pill shape).
- **Hover:**
  - `box-shadow: 0 0 18px <cat@40%>` glow.
  - `transform: translateY(-1px)` micro-lift.
  - 200 ms cubic-bezier transition on both.
  - Skipped under `prefers-reduced-motion`.
- **Entrance:** framer-motion fade + 8 px slide-up, 280 ms, 40 ms stagger per index. Skipped under `prefers-reduced-motion`.
- **Title attribute** (`<skill> · <category name>`) for hover hint, except on Default where it just shows the skill.

---

## Manual verification steps (please run after Vercel deploys)

1. **Open `/ats` in production.** Upload any CV. Don't paste a JD. Click Analyze.
2. **Score badge:**
   - Score number animates from 0 to final value over ~1.2 s.
   - Outer band color matches the score (≥ 85 emerald, 60-84 amber, < 60 red).
   - Scanner arc rotates clockwise; bright leading edge visible.
   - Outer halo gently pulses (notice the glow intensity ebbing, ~ 2 s period).
3. **Structure issues section:**
   - HIGH cards have a red left border + soft red glow.
   - MEDIUM cards have an amber left border + soft amber glow.
   - LOW cards have a cyan left border + soft cyan glow.
   - The glow itself pulses — every ~ 2.5 s.
   - The HIGH/MEDIUM/LOW label text glows with matching color.
4. **Top skills detected:**
   - Each pill is colored by its category (e.g. AWS = indigo, ACLS / nursing = default slate, ASME welding = orange, Cisco = emerald).
   - Pills stagger in left-to-right with a brief slide-up.
   - Hovering a pill lifts it 1 px and adds a glowing halo in its category color.
5. **Reduced motion:**
   - DevTools → Rendering tab → Emulate CSS media feature → `prefers-reduced-motion: reduce`.
   - Reload the page.
   - Score arc fills instantly to final score, doesn't animate.
   - Scanner arc visible but stops rotating.
   - Glow halo pinned at full opacity (no pulse).
   - Severity card glow pinned at 0.6 (no pulse).
   - Skill pills don't stagger; appear instantly.
   - Functionality (numbers, colors, layout) all preserved.

---

## Files

- `src/components/ScannerRing.jsx` — new, 200 lines. Exports `ScannerRing` (default), `getBand(score)`, `withAlpha(hex, alpha)`.
- `src/components/CvOnlyResult.jsx` — modified. Uses `ScannerRing`, adds `SeverityIssueCard` + `SkillPill` sub-components, adds `categorizeSkill` + `severityColor` helpers, drops the legacy `getScoreColor` / `getScoreLabel` / `weightColor` helpers.
- `docs/visual-changes.md` — this file.

No deps added. No new build step. No backend change. Rolls back cleanly via `git revert`.
