# AUDIT_PLAN.md

Full audit plan for the WFM simulator. The app is a single `index.html`; tests
extract the **shipped functions directly from that file** (brace-matching on the
source) so every assertion runs against production code, never a copy.

## How to run

```bash
node --test tests/unit          # all unit tests (Node 18+, no dependencies)
node tests/browser/smoke.js     # E2E in headless Edge (needs puppeteer-core)
```

## Layers under audit

| # | Layer | What is tested | Files |
|---|-------|----------------|-------|
| 1 | Date/time normalization | `normDateAny`, `normTimeAny`, `dayIdxOf`, `bucket30`, `halfHoursBetween`, `isoWeek`, `sundayOf`, `toDurationSec`, `toNum` — every accepted format, ambiguous dd/mm, Excel serials/fractions, boundaries | `tests/unit/dates-times.test.js` |
| 2 | Text ingestion | `csvToGrid` (delimiters, quotes, BOM), `htmlToGrid`, header mapping `matchHeader`/`findHeader`/`classifyGrid` (HE+EN synonyms, decoys), `parseCoursesGrid` | `tests/unit/ingestion.test.js` |
| 3 | Binary ingestion | `xlsToGrid` against the real week-27 BIFF8 workbook: sheet count, names, header row, string-formula cells, serials | `tests/unit/xls-real-file.test.js` |
| 4 | Queue math | `evalInterval` / `requiredAgents`: monotonicity in agents, bounds (0..1), zero-volume, huge-volume, AR vs TSF ordering | `tests/unit/erlang.test.js` |
| 5 | Scheduler | `schedulerCore`: coverage vs demand, vacation/partial/unavailable constraints, pool swaps, gap accounting; `tikshuvRow` structure | `tests/unit/scheduler.test.js` |
| 6 | E2E (browser) | dual upload orders, week persistence, filter lists, gating, impact matrix, drill-down, scheduler run, calibration note, audit banner | `tests/browser/smoke.js` |

## Manual checklist (no automation possible)

- [ ] RTL rendering in Hebrew for every new element
- [ ] localStorage quota behavior with multi-year forecasts (saveData catch path)
- [ ] Print/export fidelity of the matrix
- [ ] Language toggle mid-session re-labels all dynamic elements

## Data-integrity invariants (asserted in tests)

1. A named roster never counts one rep twice in an interval (distinct-name sets).
2. Historical cells show measured AR, never model output, when the file provides it.
3. Iron-derived analytics use **validated** iron agents only.
4. Scheduler output row shape === Tikshuv sidur-avoda input shape (round-trip).
5. Impossible inputs (answered > offered) are flagged by the audit, not displayed silently.

## Privacy / security

- No network calls anywhere (CSP-clean, file:// operation) — verified by grep for fetch/XHR/ws.
- Real employee workbooks must never be committed (see AGENTS.md).

## Out of scope

- Visual regression (no tooling in a single-file app)
- Load testing beyond the 250-employee worker threshold
