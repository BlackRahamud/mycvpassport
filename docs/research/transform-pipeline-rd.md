# Upload & Transform — Pipeline R&D
**Date:** April 30, 2026  
**Source:** Reactive Resume (rxresu.me) — 36.5k GitHub stars  
**MIT License — open source, safe to reference**

---

## Session Summary Update — May 2, 2026

### All 4 AI Pipeline Sessions Complete
- Session 1 (eb8023c): two-stage parse pipeline + prompt hardening
- Session 2 (2204c59): customFields[] regional fields escape hatch
- Session 3 (88d9765): structured analysis block + Screen 4 panel
- Session 4 (1f265f7): Template 19 UAE ATS + T10 ghost-page fix

### Next Sprint — In-Builder AI Tailor Feature
- 2 free AI rewrite credits per free user in builder
- Uses tailor-system.md prompt pattern (Section 9)
- Per-section assist buttons: Summary, Experience, Skills
- Credit counter in Supabase per user
- On exhaustion: upgrade modal → Active Hunter AED 29/mo
- isNew flag confirmation before saving inferred skills
- Multiple tailored CV versions per job application
- Files to grab from Reactive Resume:
  src/integrations/ai/tools/tailor.ts
  src/integrations/ai/store.ts
  src/routes/builder/-sidebar/left.tsx

### Deferred
- Skills array + experience.roles[] schema migration
- Template polish session (16 remaining templates)
- copyPrompt "Fix this" button UI
- Builder 3-panel resizable layout
- Auto-save debounce + undo/redo

---

## 1. Schema (data.ts)
- Uses Zod for every field — typed, described, validated
- Claude gets field descriptions as context → prevents hallucination
- `basicsSchema` has `customFields[]` array — escape hatch for regional fields
- We use this to add `visa_status`, `notice_period`, `driving_license` without breaking existing schema
- All optional fields return null, never guessed

## 2. AI Analysis Output Shape (analysis.ts)
```json
{
  "overallScore": 0-100,
  "scorecard": [{ "dimension": "", "score": 0-100, "rationale": "" }],
  "suggestions": [{
    "title": "",
    "impact": "high | medium | low",
    "why": "",
    "exampleRewrite": "string | null",
    "copyPrompt": ""
  }],
  "strengths": ["string"]
}
```
- Max 10 suggestions, max 10 strengths
- `exampleRewrite` = before/after per suggestion → powers "What we fixed" panel Screen 4
- `copyPrompt` = ready-to-fire prompt per fix → "Fix this" button UX
- `storedResumeAnalysis` adds `modelMeta: { provider, model }` → debug quality drops

## 3. Tailor Output Shape (tailor.ts)
- Index-based patching — AI returns `{ index, description }` not full rewrites
- Patch by position, original data stays intact
- `isNew: boolean` flag on every skill — inferred skills flagged vs extracted ones
- 6-10 skills cap enforced in schema description
- No em-dashes rule — every text field says "No emdashes or endashes"
- Targeted patch only: summary, relevant experiences, references, skills
- `roles[]` nested patching — career progression within same company patched at role level

## 4. PDF Parser System Prompt (pdf-parser-system.md) — STEAL THIS
You are a strict resume extraction engine for PDF files.
CONFLICT RESOLUTION ORDER:

Schema validity (must return valid JSON matching template shape)
Source fidelity (exactly what the PDF states)
Omit uncertain values (never guess)

HARD CONSTRAINTS:

Extract only explicitly stated information
Never fabricate, infer, or normalize missing data
Keep original wording and original language
When uncertain, omit content and leave template defaults
Do not use external knowledge

EXTRACTION RULES:

Ignore OCR noise, watermarks, repeated headers/footers, broken line wraps
Dates: preserve exactly as written
URLs: include only full URLs explicitly present
Contact data: copy as-is, do not reformat
Skills: include only explicit skill mentions
Descriptions: output HTML using <p>, <ul>, <li>
When missing, use empty defaults, never guess

FALLBACK:

If PDF is low quality or partially unreadable, return best-effort for readable parts only

OUTPUT CONTRACT:

Return only one raw JSON object
No markdown, no commentary, no extra keys


## 5. Page Dimensions
- A4 = 794×1123px / 210×297mm — UAE/GCC/India standard
- Letter = US only, ignore
- Hardcode A4 for all transform output

## 6. What We Steal
| Pattern | Apply to CVPassport |
|---|---|
| Conflict Resolution Order | Add to our parse stage prompt |
| Index-based patching | Transform patches experience by index |
| `isNew` flag on skills | Flag inferred vs extracted skills |
| 6-10 skills cap | Add to action=run prompt |
| No em-dashes rule | Add to action=run prompt |
| Zod output validation | Validate Claude JSON before saving to Supabase |
| `exampleRewrite` per suggestion | Structure "What we fixed" panel |
| `modelMeta` tracking | Add to transform_sessions table |
| Two-stage pipeline | Parse → Rewrite (two separate Claude calls) |

## 7. What We Do NOT Steal
- Their full schema — US-centric, no regional fields
- Their templates — designed for Western markets
- Docker/self-hosting infrastructure
- Photo on CV — removed for UAE/GCC norms

## 8. Implementation Plan (READY TO BUILD)
### Stage 1 — Two-stage pipeline
- Add `action=parse` to api/transform.js (~40 lines)
- Fires before `action=run`
- Uses pdf-parser-system prompt above adapted for our JSON schema
- Output: cleaned structured text, not raw PDF dump

### Stage 2 — Schema extension
- Add `custom_regional` to basics: `visa_status`, `notice_period`, `driving_license`
- All nullable, all optional
- Template renders piped status row if any present

### Stage 3 — Prompt hardening
- Add Conflict Resolution Order to action=run
- Add 6-10 skills cap
- Add no em-dashes rule
- Add A4 density note
- Add `isNew` flag to skill output
- Add `exampleRewrite` to suggestion output

### Stage 4 — Zod validation
- Validate Claude JSON output before saving to Supabase
- On validation fail: fall back to intake answers for missing fields
- Never save malformed data to transform_sessions.cv_data

### Stage 5 — modelMeta
- Add `model_meta: { provider, model, timestamp }` to transform_sessions table
- Populate on every action=run call

That's the complete R&D saved. Nothing gets lost now. Ready to implement when you say go.

## 9. Tailor System Prompt (tailor-system.md) — STEAL THIS

Full prompt from Reactive Resume. This is their actual production prompt for CV tailoring.

Key rules to steal for our action=run:

### Formatting Rules (copy exactly)
1. No emdashes or endashes — use commas, periods, semicolons, hyphens instead
2. No curly/smart quotes — straight quotes only
3. No special whitespace — standard spaces only
4. No ellipsis character — use three periods instead
5. ASCII punctuation only
6. HTML content fields use <p>, <ul>, <li>, <strong>, <em>
7. No markdown — all text output is HTML

### ATS Strategy (adapt for UAE/GCC)
- Incorporate keywords from target industry/role naturally
- Use action verbs mirroring job posting language
- Quantify achievements where numbers exist — NEVER fabricate statistics
- Front-load most relevant qualifications in summary

### Experience Rules (steal verbatim)
- Rewrite EVERY experience item — never skip any
- Even unrelated positions get rewritten for transferable skills
- NEVER return empty experiences array
- If role progression exists, tailor EACH role individually

### Skills Rules (steal verbatim)
- 6-10 skill items total — curate, don't dump
- `isNew: true` on inferred skills, `isNew: false` on extracted skills
- Consistent proficiency label style across ALL skills
- Keywords: 2-5 specific technologies per skill category

### Truthfulness Rules (steal verbatim)
1. Only emphasize existing experience — never fabricate
2. Do not add experience, education, certifications not in original CV
3. Preserve candidate voice and tone
4. When adjusting wording, meaning must remain accurate

### Template Variables Pattern
They inject data via {{RESUME_DATA}}, {{JOB_TITLE}}, {{COMPANY}}, {{JOB_DESCRIPTION}}
We use the same pattern for our buildUserPrompt function — intake answers injected as variables

## 10. Analyze Resume System Prompt (analyze-resume-system.md) — STEAL THIS

Full prompt from Reactive Resume for CV analysis.

### Output Contract (steal exactly)
```json
{
  "overallScore": 0-100,
  "scorecard": [
    { "dimension": "", "score": 0-100, "rationale": "" }
  ],
  "suggestions": [
    {
      "title": "",
      "impact": "high | medium | low",
      "why": "",
      "exampleRewrite": "string | null",
      "copyPrompt": ""
    }
  ],
  "strengths": ["string"]
}
```

### Evaluation Dimensions
- Clarity and specificity
- Impact and quantification
- ATS compatibility
- Structure and completeness
- Language quality and relevance

### Rules (steal verbatim)
1. 0-100 scoring for each dimension and overall
2. Rationales concise, specific, evidence-based from resume content
3. Suggestions prioritized by impact, must be actionable
4. Never invent candidate achievements or facts
5. If data missing, call it out explicitly
6. Keep scorecard dimensions practical

### copyPrompt Rule
Each suggestion includes a ready-to-fire prompt the user can copy to improve that section in another LLM call. Example: "Rewrite my experience bullets to emphasize measurable outcomes and ATS keywords. Keep each bullet under 25 words and include a metric where possible."

### Apply to CVPassport
- Screen 4 preview "What we fixed" panel uses this exact output shape
- overallScore → ATS score shown on preview
- suggestions → "What we fixed" list with impact badges
- exampleRewrite → before/after shown per fix
- copyPrompt → "Fix this" button fires the prompt

## 11. Preview Component (preview.tsx) — Builder Improvements

### Template Registry Pattern
```js
match(template)
  .with("glalie", () => GlalieTemplate)
  .with("uae-ats", () => UAEATSTemplate) // ← add Template 2 here
  .exhaustive()
```
One line to register a new template. Steal this pattern exactly.

### Overflow Detection — Fix Ghost Page Bug
```js
useResizeObserver → measure pageHeight
if pageHeight > maxPageHeight → show warning
```
Prevents blank page below content. Add to our PDF preview component.

### Real-time Sync Pattern
- Zustand store (`useResumeStore`) drives all data
- Every JSON change reflects instantly in preview
- No "generate" button needed
- This is the builder improvement target

### Custom CSS Scoping
- User CSS scoped to `.resume-preview-container`
- Prevents bleed outside CV
- Steal for our template system

### Template 2 Registration Plan
When we build UAE ATS single-column template:
1. Create `src/components/templates/UAEATSTemplate.jsx`
2. Register in our template switcher
3. Set as default for transform output
4. Existing templates untouched

## 12. Glalie Template (glalie.tsx) — Visual Reference

### customFields renders regional fields automatically
```jsx
{basics.customFields.map((field) => (
  
    
    {field.link 
      ?  
      : {field.text}}
  
))}
```
visa_status, notice_period, driving_license injected as customFields.
No schema migration. Renders with icon automatically. If null, doesn't appear.

### Conditional rendering pattern
```jsx
{basics.email && ...}
```
Every field conditional. Missing fields render nothing. Use this pattern for all regional fields.

### Glalie is two-column not single column
- Sidebar: header, contact, skills
- Main: experience, education
- This causes the ghost page bug on content-heavy CVs
- Our UAE Template 2 must be single column only
- Use `fullWidth: true` in pageLayout to force single column

### Template 2 Plan — UAE ATS Single Column
- No sidebar
- Header: name → target role → contact row → status row (visa | notice | license)
- Skills: categorised matrix, pipe separated
- Experience: job title | dates, company | location, max 5 bullets
- All conditional rendering — missing fields render nothing
- page-break-inside: avoid on every job entry

## 13. page-section.tsx — Page Break + Section Rendering

### The ghost page fix
```jsx
// On every section item:
className="section-item print:break-inside-avoid"

// On every section heading:
className="print:break-after-avoid"
```
Two Tailwind print utilities. Fixes content splitting mid-page.

### Double guard pattern
```js
if (section.hidden) return null;
if (items.length === 0) return null;
```
No ghost sections. No empty whitespace. If no items, nothing renders.

### Data-driven columns
```js
gridTemplateColumns: `repeat(${section.columns}, 1fr)`
```
Columns set in JSON, not hardcoded CSS. 1=single, 2=two column.

### CSS variables for spacing
```js
gap-x-(--page-gap-x) gap-y-(--page-gap-y)
```
All spacing via CSS variables — consistent across templates.

### Apply to CVPassport
- Add print:break-inside-avoid to every job entry wrapper in all templates
- Add print:break-after-avoid to every section heading
- Add double guard to every section component
- These three changes fix the ghost page bug

## 14. inline-header.tsx — Job Entry Header Layout

### The pattern
```jsx

  {jobTitle}
  {company}
  {dates}

```

### Why it works
- Job title + company: flexible, shrink/grow together, wrap naturally
- Dates: auto width, right-aligned, never wraps, always on same line
- All three top-aligned via items-start
- No fixed widths — content dictates layout

### Apply to CVPassport
- Use in every experience entry in all templates
- Use in education entries (degree | school | dates)
- Replace any current stacked or inconsistent job header layouts
- Built explicitly for Asian/regional resume conventions — matches UAE norms

## 15. skills-item.tsx — Skills Rendering Without Bubbles

### Keywords as plain text
```js
item.keywords.join(", ")
// Outputs: "React, TypeScript, Next.js"
```
No bubbles. No tags. No progress bars. Pure comma-separated text. ATS-readable.

### Structure per skill item
1. Icon + skill name (bold header)
2. Proficiency label — conditional, renders nothing if empty
3. Keywords — comma joined, opacity 80 for visual hierarchy
4. Level indicator — set level=0 to hide completely

### Conditional rendering
```js
{item.proficiency && {item.proficiency}}
{item.keywords.length > 0 && {item.keywords.join(", ")}}
```
Empty fields render nothing. No ghost rows.

### Apply to CVPassport
- Replace current bubble/tag skills with this pattern
- Set level=0 for all UAE/GCC CVs — no percentage scores
- Use keywords array for categorised skills matrix
- Format: "Technical: Active Directory, O365, Windows Server"

## 16. page-summary.tsx — Summary Section Rendering

### stripHtml guard — prevents ghost summary
```js
if (section.hidden || !stripHtml(section.content)) return null;
```
Strips HTML tags before checking emptiness.
`<p></p>` = empty = renders nothing.
Apply this pattern to every text content field in CVPassport templates.

### HTML content rendering
- Summary stored as HTML string
- Rendered directly in template
- Column count data-driven via section.columns

### Apply to CVPassport
- Add stripHtml check to summary section in all templates
- If summary is empty string or whitespace only — render nothing
- Prevents blank summary section taking up space on CV

## 17. use-css-variables.ts — Design Token System

### Full CSS variable list for CV templates
```css
--page-width / --page-height         → pageDimensionsAsMillimeters[format]
--page-sidebar-width                 → metadata.layout.sidebarWidth + "%"
--page-text-color                    → design.colors.text
--page-primary-color                 → design.colors.primary (headings, icons)
--page-background-color              → design.colors.background
--page-body-font-family              → typography.body.fontFamily
--page-body-font-weight              → lowest body font weight
--page-body-font-weight-bold         → highest body font weight (min 700)
--page-body-font-size                → typography.body.fontSize (pt)
--page-body-line-height              → typography.body.lineHeight
--page-heading-font-family           → typography.heading.fontFamily
--page-heading-font-weight           → lowest heading font weight
--page-heading-font-weight-bold      → highest heading font weight (min 700)
--page-heading-font-size             → typography.heading.fontSize (pt)
--page-heading-line-height           → typography.heading.lineHeight
--page-margin-x / --page-margin-y    → page.marginX/Y + "pt"
--page-gap-x / --page-gap-y          → page.gapX/Y + "pt"
```

### Font weight safety logic
```js
// Never let bold = regular weight (invisible bold text)
const highestWeight = rawHighest <= lowest ? 700 : rawHighest;
```

### Apply to CVPassport
- Create useCSSVariables hook injecting all tokens at template root
- Replace all hardcoded font sizes, margins, colors in templates
- Templates consume var(--page-body-font-size) not "11px"
- Change one value in metadata → updates entire CV instantly
- This is prerequisite for Template 2 and real-time builder sync

### UAE ATS Template 2 defaults
```js
bodyFontSize: 11,
bodyLineHeight: 1.4,
headingFontSize: 14,
marginX: 14, marginY: 12,
gapX: 4, gapY: 6,
format: "a4",
primaryColor: "rgba(0,0,0,1)",    // black — no color accents for ATS
textColor: "rgba(26,26,26,1)",
background: "rgba(255,255,255,1)"
```

## 18. preview.module.css — Print CSS System

### Font size hierarchy (all relative to base token)
```css
.page {
  font-size: calc(var(--page-body-font-size) * 1pt);
  h1 { font-size: calc(var(--page-heading-font-size) * 1.5pt); }
  h2 { font-size: calc(var(--page-heading-font-size) * 1.25pt); }
  h3 { font-size: calc(var(--page-heading-font-size) * 1.125pt); }
  h4 { font-size: calc(var(--page-heading-font-size) * 1pt); }
  h5 { font-size: calc(var(--page-heading-font-size) * 0.875pt); }
  h6 { font-size: calc(var(--page-heading-font-size) * 0.75pt); }
}
```
Change one variable → entire hierarchy scales. No more hardcoded px sizes.

### Performance — lazy render pages after page 1
```css
.page:not(:first-child) {
  content-visibility: auto;
  contain-intrinsic-size: var(--page-width) var(--page-height);
}
```
Skips rendering offscreen pages. Fast builder even with 3-page CVs.

### RTL support for Arabic
```css
p[style*="text-align: right"] { direction: rtl; word-wrap: break-word; }
ul:has(li[style*="text-align: right"]) { direction: rtl; }
```
Arabic text renders correctly. UAE market requirement.

### Strong uses bold weight token
```css
strong { font-weight: var(--page-body-font-weight-bold); }
```
Bold text uses the highest available font weight, never invisible.

### Apply to CVPassport
- Replace all hardcoded font sizes in templates with this scaling system
- Add content-visibility optimization to page 2+ containers
- Add RTL support for Arabic name/company fields
- Add word-wrap: break-word to all text containers — prevents overflow

## 19. onyx.tsx — Single Column Template (Our Template 2 Base)

### Structure
```jsx

  {isFirstPage && }
  {main.map(sections)}
  {!fullWidth && {sidebar.map(sections)}}

```
Set fullWidth:true → sidebar gone → pure single column.

### Header contact row
```jsx

  {email && }
  {phone && }
  {location && }
  {customFields.map(field => (
    
    {field.text}
  ))}

```
customFields render at end of contact row — visa_status, notice_period,
driving_license inject here automatically with icons.

### All spacing from CSS variables
- space-y-(--page-gap-y) between sections
- px-(--page-margin-x) horizontal padding
- pt-(--page-margin-y) top padding
- Zero hardcoded values

### Header separator
```jsx
border-b border-(--page-primary-color) pb-(--page-margin-y)
```
Clean line between header and content in primary color.

### UAE ATS Template 2 plan
Based on Onyx with these changes:
1. fullWidth: true always — no sidebar
2. Header adds status row below contact row:
   visa | notice period | driving license (piped, from customFields)
3. Skills rendered as categorised matrix not individual items
4. Experience uses InlineHeader pattern (job title | company | dates)
5. print:break-inside-avoid on every job entry
6. primaryColor: rgba(0,0,0,1) — no color accents, pure ATS
7. Default font: Inter 11pt, lineHeight 1.4

## 20. resume store (resume.ts) — Real-time Sync + Undo/Redo

### Auto-save pattern
```js
const syncResume = debounce(_syncResume, 500)
window.addEventListener("beforeunload", () => syncResume.flush())
```
- Saves 500ms after last keystroke
- Flushes immediately on tab close
- No save button needed
- Zero data loss

### The update function — one call updates everything
```js
updateResumeData((draft) => {
  draft.basics.name = "New Name"  // any mutation
})
// → immer handles immutability
// → preview updates instantly
// → auto-save fires after 500ms
```

### Undo/Redo — 100 levels free
```js
temporal(immer(...), { limit: 100, equality: isDeepEqual })
```
- zundo tracks every updateResumeData call
- Ctrl+Z / Ctrl+Y work anywhere
- Deep equality check prevents duplicate history entries

### Locked resume protection
```js
if (state.resume.isLocked) {
  toast.error("This resume is locked")
  return state
}
```
Published/shared resumes can be locked from editing.

### Error toast pattern
- Persistent error toast on sync fail (duration: Infinity)
- Auto-dismissed on next successful save
- AbortError on navigation ignored cleanly

### Apply to CVPassport builder
1. Replace manual save with debounced auto-save (500ms)
2. Add zundo for undo/redo (huge UX win, no competitor has it)
3. Add beforeunload flush to prevent data loss
4. Wrap all form updates in single updateResumeData pattern
5. Add locked state for published CVs
6. This is the difference between "feels like a tool" and "feels like software"

## 21. experience-item.tsx — Job Entry Rendering

### Two header layouts
```js
headerLayout="split"   // Western: company/position left, location/dates right
headerLayout="inline"  // UAE/Asian: position(location) | company | dates on one row
```
Set inline for UAE ATS Template 2.

### Inline header structure for UAE
```jsx
leading:  "IT Help Desk Technician (Abu Dhabi)"
middle:   "Al Nufa Real Estate" (linked if URL exists)
trailing: "Oct 2025 – Present" (whitespace-nowrap)
```

### Role progression — fixes "same company twice" bug
```jsx
// One company entry, multiple roles inside:
{hasRoles && item.roles.map(role => (
  <div>
    <div className="grid grid-cols-2">
      <span>{role.position}</span>
      <span className="text-end">{role.period}</span>
    </div>
    <TiptapContent content={role.description} />
  </div>
))}
```
Mk Haj & Umrah Travels: IT Support Technician + IT Technician
= one company, two roles. Not two separate entries.

### stripHtml guard on description
```jsx
className={cn("...", !stripHtml(item.description) && "hidden")}
```
Empty description = hidden, not removed. No ghost whitespace.

### whitespace-nowrap on dates
```jsx
<span className="whitespace-nowrap">{item.period}</span>
```
"Oct 2025 – Present" never splits mid-string across lines.

### filterFieldValues pattern
Only renders fields that have actual values. Null fields produce no DOM nodes.

### Apply to CVPassport
- Add headerLayout prop to experience items in all templates
- Set inline layout for UAE ATS Template 2
- Fix brother's CV: merge two Mk Haj entries into one company + two roles
- Add whitespace-nowrap to all date fields
- Add stripHtml hidden class to description containers

## 22. education-item.tsx — Education Entry Rendering

### Smart field combining
```js
// Only joins if both fields exist — no trailing separators
const degreeAndGrade = [degree, grade].filter(Boolean).join(" • ")
const locationAndPeriod = [location, period].filter(Boolean).join(" • ")
```

### Inline header for UAE education
```jsx
leading:  "Computer Applications (BCA)"   // area (degree)
middle:   "Institute Name"                 // school, linked if URL
trailing: "2017"                           // whitespace-nowrap
// Secondary line: grade • location at opacity-80
```

### Split header (Western style)
```
Left column:  school name, area of study
Right column: degree • grade, location • period
```

### stripHtml guard on description
```jsx
className={cn("...", !stripHtml(item.description) && "hidden")}
```

### Apply to CVPassport
- Add headerLayout="inline" to education in UAE ATS Template 2
- Use filter(Boolean).join(" • ") pattern for all combined fields
- Add secondary grade+location line below inline header
- BCA on brother's CV: "Bachelor of Computer Applications (BCA)" | "IBMR" | "2017"
- Add UAE equivalency note as description: "Equivalent to BSc Computer Science"

## 23. builder/_layout.tsx — Builder Layout Architecture

### Three-panel resizable layout
```
[Left Sidebar] | [Artboard/Preview] | [Right Sidebar]
  form inputs      live CV preview    design settings
```
All three panels resizable and collapsible via react-resizable-panels.

### Panel size persistence
```js
// Saved to cookie on every resize
setCookie(BUILDER_LAYOUT_COOKIE_NAME, JSON.stringify(layout))
// Restored on next visit
const layout = getCookie(BUILDER_LAYOUT_COOKIE_NAME)
```

### Mobile: sidebars collapse to 0
```js
leftSidebarSize = isMobile ? "0%" : initialLayout.left + "%"
```
Mobile shows preview only. Sidebars accessible via toggle buttons.

### CSS variables at builder root
```js
const style = useCSSVariables(resume.data)
// Applied to entire builder wrapper div
// All templates inherit from here
```

### Store lifecycle
```js
useEffect(() => {
  initialize(resume)           // load on mount
  return () => initialize(null) // clear on unmount
}, [resume])
```

### Apply to CVPassport builder
- Add right sidebar for design settings (colors, fonts, margins)
- Add resizable panels — left form, middle preview, right settings
- Persist panel sizes in localStorage
- Mobile: single panel, toggle between form and preview
- This is the builder UX gap vs Reactive Resume

## 24. ai/store.ts — AI Settings Store Pattern

### Credit status pattern (adapt for our use)
```js
type CreditStatus = "available" | "exhausted" | "upgraded"

// Gate the AI assist button
canUseAI: () => {
  const { creditStatus } = get()
  return creditStatus === "available" || creditStatus === "upgraded"
}
```

### Our AI store shape (not their BYOK model)
```js
{
  aiCreditsUsed: 0,        // track per user in Supabase
  aiCreditsLimit: 2,       // free tier limit
  plan: "free",            // free | express | hunter | pro
  creditStatus: "available" // available | exhausted | upgraded
}
```

### Key difference from Reactive Resume
- They: user brings own API key (BYOK)
- Us: server-side Claude API key, credit-gated by plan
- Free: 2 credits total in builder
- Active Hunter/Pro: unlimited

## 25. Teal HQ Builder UI — AI Feature Patterns

### "Write with AI" button pattern (Summary section)
```jsx

  ✨ Write with AI ({creditsRemaining} left)

```
- Yellow/amber pill button inside the textarea
- Credit count shown directly on button
- On click: AI rewrites summary, shows result inline
- On 0 credits: same button → opens upgrade modal

### "Improve with AI" on bullet hover
- Bullet toolbar appears on hover: edit | AI | duplicate | reorder | delete
- AI icon is sparkle ✨ — tooltip "Improve with AI"
- Click → modal with 3 AI alternative rewrites
- Radio button selection → "Use AI Bullet" confirm

### Analyzer tab — paywall pattern
- Score ring (52%) visible to all
- Dimension breakdown visible: Structure, Measurable Results, Keywords
- Issue count visible: "14 Issues"
- All recommendations blurred below upgrade CTA
- "Upgrade to Teal+" yellow button

### Guidance panel (free, no credits)
- Right side panel, contextual per section
- Writing tips, best practices, examples
- Free for all users — keeps them engaged
- No AI credits needed

### Credit counter location
- On the button itself: "① Write with AI"
- Number badge = remaining credits
- After exhaustion: button still shows, click triggers upgrade

### Apply to CVPassport
- Add "✨ Write with AI (2 left)" to Summary textarea
- Add sparkle icon to bullet hover toolbar
- Credit counter in Supabase: ai_credits_used per user
- Free tier: 2 credits total
- Active Hunter/Pro: unlimited
- Upgrade modal on exhaustion: "Unlock unlimited AI rewrites — AED 29/mo"

## 26. Teal HQ — Template Library + Target Title UI

### Template library filters
```
Styles: Modern | Traditional | Creative
Layouts: 1 Column | 2 Column | Mixed
Membership: Free | Premium (gold bookmark icon on locked templates)
```
Hover state shows "Preview Template" overlay with + icon.
Live preview updates on right panel instantly on selection.

### Target Title field
Dedicated field at top of builder — separate from work experience.
Feeds job matching and AI tailoring context.
Apply to CVPassport: add "Target Role" field above Professional Summary.

### Bullet inline toolbar (4 icons)
On hover per bullet: edit | duplicate | AI rewrite (✦) | delete
Diamond icon = AI trigger (not sparkle)
Minimal, appears on hover only, disappears when not focused.

### CV output at parity
Teal's default template = single column, black on white, no decorations.
Our Template 19 matches this. We are visually competitive.
