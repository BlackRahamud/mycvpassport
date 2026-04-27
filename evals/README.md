# Evaluation harnesses

CI-grade eval suites for the parts of CVPassport where regressions are silent until users complain.

## Suites

| Suite | Path | What it gates |
| --- | --- | --- |
| `scan` | `evals/scan/` | The free + paid ATS scan pipeline. Phase 1 hard gate — failing this suite blocks merge of any Phase 1 PR. |

## Running

```bash
npm run eval:scan      # ATS scan suite
```

Exits non-zero on failure. Writes a baseline JSON to `evals/<suite>/baseline/<date>-baseline.json` so we can diff runs.

## Adding a fixture

Drop a JSON file into `evals/<suite>/fixtures/` matching the existing schema. Fixtures are loaded by name-sort — number them (`01-…`, `02-…`) to control order in the report.

## Replacing synthesised CVs with real anonymised samples

Phase 0 produced 30 synthesised fixtures. Per the founder's plan the target mix is **15 hand-crafted + 15 real anonymised production CVs**. To replace a synthesised fixture with a real one:

1. Anonymise the real CV (strip name, email, phone, employer names, exact dates → year-only, locations → city only).
2. Pick the synthesised fixture whose persona/role matches.
3. Replace `cv` and `synthetic: true` → `synthetic: false`. Keep `groundTruth` valid.
4. Re-run `npm run eval:scan`. Baseline shifts are expected.

## Why this exists

Phase 0 (2026-04-27) discovered the ATS scanner doesn't read CVs:
- Free path returns hardcoded scores 65/70/75 regardless of CV content.
- Paid path sends `fileBase64?.substring(0, 500)` (≈375 bytes of base64-encoded binary noise) — Claude never sees the CV.

The eval encodes "the scanner reads the CV" as four invariants:
1. **Adversarial variance** — same JD with different CVs must produce different output.
2. **Field accuracy** — `detectRole(jd)` returns the expected role for ≥90% of fixtures.
3. **Score band hit rate** — score lands in the persona-aligned band for ≥90% of fixtures.
4. **Paid prompt integrity** — the prompt sent to Anthropic contains the CV text, not 500 base64 chars.

The current code fails all four. The Phase 1 Day 2-3 rebuild has to make all four pass.
