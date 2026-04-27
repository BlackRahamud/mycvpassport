# content/

Editable market-data and content files used by mycvpassport features.
Edit YAML in this tree without a code deploy — consumers re-read on
boot or via a daily cache refresh.

## Layout

| Path | Purpose | Consumer (status) |
| --- | --- | --- |
| `salary/uae_2026.yaml` | UAE monthly salary corpus, allowances, EOSB formula | Salary benchmark module — sprint #13 (not yet built) |
| `market/uae_demand_2026.yaml` | UAE hot-sectors weights for free-tier scan match boost | Free-tier scan output — sprint #3 (not yet wired) |
| `attestation/india_to_uae.yaml` | India → UAE document attestation roadmap (full content) | `/attestation` page — sprint #7 (not yet built) |
| `attestation/india_to_ksa.yaml` | STUB — structural template, fees pending validation | sprint #7 |
| `attestation/india_to_qatar.yaml` | STUB — structural template | sprint #7 |
| `attestation/india_to_oman.yaml` | STUB — structural template | sprint #7 |
| `attestation/india_to_bahrain.yaml` | STUB — structural template | sprint #7 |
| `attestation/india_to_kuwait.yaml` | STUB — structural template | sprint #7 |
| `visas/uae.yaml` | UAE visa matrix (employment, green, golden) | Mobilization Analyzer — sprint #11 (not yet built) |
| `india/ecr_ecnr.yaml` | India ECR / ECNR rules + POE clearance countries | Free-tier scan output for Indian users — sprint #3 (not yet wired) |

Sister directory: `ats_profiles/` (for Phase 11 calibration sources)
and `src/validators/` (ID format validators).

## Refresh cadence

**Salary numbers drift fastest** — set a calendar reminder for July,
October, January to refresh `salary/uae_2026.yaml` against the latest
Robert Walters / Michael Page / Charterhouse / Hays surveys.

Stub attestation files need real fees + turnaround days; when filling,
mirror the structure of `attestation/india_to_uae.yaml`.

## Sanity check

`npm run seed:check` parses every YAML file in this tree and in
`ats_profiles/`. Add to CI alongside lint + build.
