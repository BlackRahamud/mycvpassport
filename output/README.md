# CVPassport HR Portal — Investor Walkthrough Video

## Deliverables (this folder)
| File | What it is |
|------|------------|
| `cvpassport-hr-investor-16x9.mp4` | Master cut — 1920×1080, 30 fps, ~104 s |
| `cvpassport-hr-investor-9x16.mp4` | Vertical cut for mobile/social — 1080×1920 |
| `SCRIPT_STORYBOARD.md` | Full VO script + scene-by-scene storyboard + the exact click path |
| `README.md` | This file |

## How it was built
1. **Captures** — `scripts/capture-investor-video.mjs` serves the **production build** (`npm run build` output) locally, injects a demo recruiter session, and stubs the Supabase/AI backend with fictional fixture data (company "Horizon Facilities Group", candidates Rahul Menon et al.). Playwright then *actually drives* the full flow — post-a-job wizard → publish → pipeline board → candidate detail → CV viewer → stage move → schedule interview → confirmation — and saves 2× PNG stills (`video-assets/captures/`) plus webm screen recordings with a visible cursor (`video-assets/captures/clips/`). Every frame is the real product UI as deployed; **no UI is AI-generated or mocked up**.
2. **Music bed** — `scripts/make-audio.mjs` synthesizes an ambient pad (Am7-Fmaj7-Cmaj7-G6) from raw sine math → `video-assets/audio/bed.wav`. Royalty-free by construction (no samples).
3. **Compositing** — Remotion project at `src/remotion/` (installed: `remotion`, `@remotion/cli`, `@remotion/player`). `remotion.config.js` points Remotion's public dir at `video-assets/`. Scene timings live in `src/remotion/theme.js`; the master timeline is `src/remotion/Film.jsx`; intro/close stings and the "why" tiles are programmatic motion in `src/remotion/stings.jsx`.

## Re-render
```
node scripts/make-audio.mjs                       # once, if bed.wav is missing
npx remotion render src/remotion/index.js InvestorFilm output/cvpassport-hr-investor-16x9.mp4
npx remotion render src/remotion/index.js InvestorFilmVertical output/cvpassport-hr-investor-9x16.mp4
npx remotion studio src/remotion/index.js         # interactive timeline editing
```
To re-capture screens after a UI change: `npm run build`, then
`node scripts/capture-investor-video.mjs video-assets/captures` (env `SCENES=public,wizard,portal` selects scenes).

## Placeholders — fill these in
- **Metrics beat (t≈90–97 s)** — the three tiles carry qualitative process claims only. Real numbers (median time-to-shortlist, interviews booked/week, cost per hire) were **not invented**; swap them into `WhyTiles` in `src/remotion/stings.jsx` when you have real data.
- **Voiceover** — no investor-grade TTS was available on this machine (no Python/edge-tts; SAPI voices too robotic). The full VO script is written in `SCRIPT_STORYBOARD.md`; record it (or point me at an ElevenLabs/Azure key) and drop the files into `video-assets/audio/`, then list them in `src/remotion/audio.js` (`vo: [{ src, from }]` — `from` is the scene start frame in `src/remotion/theme.js`).
- **Higgsfield intro** — Higgsfield isn't accessible from this environment, so the intro/close stings are programmatic Remotion motion on brand tokens (conic ring + particles). If you later generate Higgsfield b-roll, drop the mp4s into `video-assets/` and swap them into `IntroSting`/`Closer`.

## Deviations from the original brief (and why)
- **Not captured on the live production site.** Typing your password (authenticating) is something I'm not permitted to do, even with credentials supplied. Instead the captures drive the *production bundle* locally with fictional demo data — same code, same UI, zero real personal data (so nothing needed blurring), and the flow could be driven start-to-finish deterministically. If you sign in to a browser tab yourself, the same capture flow can be re-shot against live data.
- The kanban **drag** is replaced by the drawer's "Move to stage → Ready to interview" menu (the drag's dnd-kit sensor was flaky under automation; the menu is the same real feature).

## Demo data disclosure
All names, companies, scores and the job posting in the video are fictional fixtures. If this video is shown publicly (not just to investors 1:1), consider adding a "product demo — illustrative data" footnote card.
