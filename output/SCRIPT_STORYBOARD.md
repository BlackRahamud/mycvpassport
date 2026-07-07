# CVPassport HR Portal — Investor Walkthrough Film
**Master: 1920×1080 · 30 fps · ~104 s.  Vertical cut: 1080×1920.**
All product frames are the real production bundle (build of the deployed code) driven with fictional demo data — no real personal data anywhere. The intro/close stings are programmatic Remotion motion (no AI-generated UI).

---

## Script (VO / caption track)

| # | Beat | VO line (captions are shortened versions) |
|---|------|--------------------------------------------|
| 1 | HOOK | "Every Gulf role attracts hundreds of CVs. Almost none of them fit — and recruiters lose days finding out." |
| 2 | SOLUTION | "CVPassport for Employers closes the whole loop: post the role, screen scored applicants, and book the interview — in one portal." |
| 3 | POST | "Posting takes minutes. A guided wizard captures the role, skills, salary band and description — with a live preview as you type." |
| 4 | LIVE | "Publish, and the job is live on the board. That's the whole setup." |
| 5 | ARRIVE | "Candidates apply — and arrive already scored against your job description. Your shortlist starts sorted, not raw." |
| 6 | SCREEN | "Open the top match: an ATS fit score, a two-second verdict, and the CV side-by-side with the skills analysis." |
| 7 | MOVE | "One click moves them through the pipeline — shortlist to ready." |
| 8 | SCHEDULE | "Then close the loop: pick a time, and CVPassport emails the calendar invite for you." |
| 9 | PAYOFF | "From job post to booked interview — the entire hiring loop, inside one product." |
| 10 | WHY | "Built for the India-to-Gulf hiring corridor: scored on arrival, one-click stage moves, invites sent for you." *(metric slots below)* |
| 11 | CLOSE | "CVPassport for Employers. The hiring loop, closed. mycvpassport.com/employer" |

**[METRICS PLACEHOLDER]** — beat 10 reserves a stat-tile row. No numbers are invented; the three tiles currently carry qualitative process claims. Swap in real metrics (e.g. median time-to-shortlist, interviews booked / week) when you have them.

---

## Scene-by-scene storyboard

| t (s) | Scene | Asset | Motion | Caption (lower third) |
|-------|-------|-------|--------|------------------------|
| 0–4.5 | Intro sting | Remotion-native: dark #0A0A0A, amber conic ring, drifting particles, wordmark | Ring rotation + logo reveal | "Hiring in the Gulf: hundreds of CVs, few fits" |
| 4.5–9 | Solution card | Wordmark + one-liner | Kinetic type reveal | "Post → Screen → Interview. One portal." |
| 9–14 | Landing | `01-landing-hero.png` | Slow push-in | "CVPassport for Employers" |
| 14–20 | Wizard: role | `03-wizard-start.png` | Pan right→left, click ring on Continue | "Post a role in minutes" |
| 20–26 | Wizard: skills+salary | `04-wizard-skills-salary.png` | Push-in on chips + salary | "Skills and salary band — guided" |
| 26–31 | Wizard: JD | `06-wizard-jd.png` | Push-in on editor + live preview | "Paste the JD — live preview" |
| 31–37.5 | HERO: publish | `07-wizard-hire.png` → `08-job-live-success.png` | Click ring on "Hire Now", crossfade to success, badge scale-pop | "Publish. The job is live." |
| 37.5–43 | Jobs board | `09-jobs-list.png` | Push-in on triage row | "Every role, one command view" |
| 43–50 | Pipeline board | `10-pipeline-board.png` | Pan across columns, zoom on Shortlist % chips | "Applicants arrive ATS-scored" |
| 50–58 | Candidate detail | `11-candidate-detail.png` | Push-in on score ring 88 + verdict bullets | "A two-second verdict on every CV" |
| 58–65 | CV viewer | `12-cv-viewer.png` | Slow pan CV→intelligence panel | "The CV and the fit analysis, side-by-side" |
| 65–70.5 | Stage move | `13-moved-to-ready.png` | Highlight ring on Ready column card | "One click moves them forward" |
| 70.5–77 | Schedule modal | `14-schedule-modal.png` | Push-in on date/time, click ring on "Schedule & notify" | "Pick a time…" |
| 77–84 | CLIMAX: confirmed | `15-schedule-confirmed.png` | Check-pop, hold, glow | "Interview scheduled. Invite emailed." |
| 84–90 | Payoff board | `16-payoff-detail.png` | Slow pull-out from Ready column | "Job post → booked interview. One portal." |
| 90–97 | Why it matters | Remotion tiles | Stagger-in 3 tiles | "Scored on arrival · One-click pipeline · Invites sent for you" + `[METRIC SLOTS]` |
| 97–104 | Close | Wordmark + CTA | Conic ring returns, fade to black | "The hiring loop, closed. — mycvpassport.com/employer" |

Vertical cut (1080×1920): same timeline; frames rendered inside a taller canvas with the browser frame scaled to width and captions moved under the frame.

---

## Capture click-path (what advances each step — matches the recordings)
1. `/employer` → Sign in → `/employer/post`
2. Wizard: Job Title "Operations Manager" → Location "Dubai, UAE" → Continue
3. Salary 14,000–18,000 AED + skill chips (Logistics, Fleet management, SAP MM, Team leadership) → Continue ×2
4. JD typed → Continue → consents ✓✓ → **Hire Now** → "Job Successfully Created"
5. Jobs → Operations Manager pipeline (board) → click "Rahul Menon 91%" card
6. Drawer: **View CV** → Esc → stage chevron → **Ready to interview**
7. Reopen Rahul (Ready column) → **Schedule interview** → 09-07-2026, 10:30 → **Schedule & notify** → "Interview scheduled" ✓

Raw clips: `video-assets/captures/clips/wizard.webm`, `portal.webm` (with a visible cursor dot showing every click).
