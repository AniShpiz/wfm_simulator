# AGENTS.md

Guidance for AI agents working in this repository.

## What this repository is

This is a zero-dependency, single-file WFM simulator for an Israeli call center.
The full app lives in `index.html` (about 4.8k lines). It is pure client-side
HTML + CSS + vanilla JS, no build step, no framework, no server.

Open `index.html` directly in a browser to run.

Core product areas:

- Forecast ingestion and forecasting models
- Roster/constraints ingestion (including Tikshuv multi-sheet workbooks)
- Weekly matrix and trends
- Workforce and Iron dashboard (כוח אדם וברזל)
- Demand-driven auto-scheduler
- Recruitment/training simulations

## Project layout

- `index.html`: entire app and business logic
- `AGENTS.md`: this file
- `README.md`: currently minimal
- `LICENSE`: MIT
- `סידור עבודה מושלם שירות שבוע 27 עדכני.xls`: real legacy workbook for validation

Companion docs (read the one matching your task before editing):

- `ARCHITECTURE.md`: runtime model, main state, rendering flow
- `INGESTION_SPEC.md`: supported input types and detection order
- `TESTING.md`: manual smoke-test procedure (no automated tests exist)
- `TROUBLESHOOTING.md`: known failure modes (stale localStorage, header errors)
- `DATA_PRIVACY.md`: local-processing guarantees
- `CONTRIBUTING.md`: constraints and branching
- `DESGIN.md` (sic): product design principles
- `CHANGELOG.md`: unreleased changes log — update it with your change

## Non-negotiable rules

- Keep the project single-file and offline-capable. Do not add dependencies.
- Never send user data to external services. Parsing and analytics remain in-browser.
- Maintain bilingual behavior. Any new user-facing string must be added to both EN and HE in `I18N` and wired via `data-i18n`/`t()`.
- Preserve local coding style (compact, terse, direct). Avoid broad reformatting.

## Architecture map

Key areas in `index.html`:

- UI pages and controls are in the HTML body sections near the top.
- Internationalization dictionary is in `const I18N` with `setLang()` and `t()`.
- State-driven rendering uses one central `state` object and page renderers.
- Queue math is Erlang A/C based (`evalInterval`, `requiredAgents`, etc.).
- Data ingestion is universal and auto-detecting (`bytesToGrid` -> `ingestRows`).
- Persistence is via localStorage:
  - `wfmSimWorkspace` for settings/policies/sims
  - `wfmSimData` for uploaded dataset and derived structures

## Ingestion pipeline (most sensitive area)

The app implements file parsing itself (no SheetJS).

Primary path:

1. `ingestFile(file, hint)`
2. `bytesToGrid(buf)` detects file type and returns grid/json/multi-sheet
3. `ingestRows(res, hint)` classifies and routes
4. Build functions populate state and trigger renders

Important functions:

- `xlsxToGrid(buf)`: ZIP/XML parser, all sheets
- `xlsToGrid(buf)`: BIFF8/CFB legacy `.xls` parser, visible sheets preferred
- `htmlToGrid`, `csvToGrid`: disguised HTML/CSV/TSV support
- `findHeader` + `SYN` + `matchHeader`: fuzzy EN/HE header mapping
- `buildForecastGrid`: robust forecast ingestion and normalization
- `buildRosterGrid`: long-format roster/constraints ingestion
- `parseMatrixRoster`: day x interval matrix roster ingestion
- `parseTikshuvWorkbook`: fuzzy pairing of Iron + roster sheets in one workbook
- `applyDataWeek`: updates active week from ingested roster dates

Tikshuv workbook support is explicit:

- Iron-like sheet is detected by `/ברזל|iron|בסיס/i`
- Roster-like sheet is detected by `/סידור|roster|actual/i`
- Extras are extracted for workforce analytics via `walkRosterExtras`

Real Tikshuv workbook shape (the `.xls` in the repo root): legacy multi-sheet
BIFF8, ~23 sheets, several hidden (`ADMIN` is first and empty). The two sheets
that matter are long-format with header row 0:

| Col | Header      | Meaning                        |
|-----|-------------|--------------------------------|
| A   | מוקד        | site                           |
| B   | כניסה       | start (Excel day-fraction)     |
| C   | יציאה       | end (Excel day-fraction)       |
| D   | תאריך       | date (Excel serial)            |
| E   | יום         | day (Hebrew letter א–ו)        |
| F   | שם הנציג/ה  | rep name                       |
| J   | מנהל צוות   | team                           |
| N   | מיומנות     | skill                          |

Note: in the week-27 export, columns A/J/N are empty in every data row, so the
workforce filter lists legitimately show only "(all)" for this file.

## Workforce and scheduler data flow

- Workforce filters are populated from both roster metadata and Iron data:
  - `wfFilterValues`
  - `populateWfFilters`
- Workforce KPIs and visuals:
  - `computeWorkforce`
  - `renderTreemap`
  - `renderImpactMatrix`
  - `renderValidation`
- Scheduler:
  - `schedulerCore` (2-pass greedy + constraints)
  - `runScheduler` and `renderSchedulerResults`
  - Optional constraints ingestion via `parseConstraintsGrid`

## Persistence and reset behavior

- `saveState`/`loadState` persist settings/policy/courses/injections/language.
- `saveData`/`loadData` persist uploaded datasets and derived operational structures.
- Workspace reset action clears both persisted layers and restores defaults.

When debugging ingestion or rendering, clear localStorage or use UI reset to avoid stale cached state.

## Practical validation checklist

After changing ingestion, workforce, or scheduler logic:

1. Reload app and test drag-drop into both forecast and roster portals.
2. Test drop-anywhere upload path (outside portals).
3. Validate legacy `.xls` workbook ingestion with the real file in repo root.
4. Confirm week auto-selection follows roster data (`applyDataWeek` effect).
5. Check Workforce filters (team/skill/site) populate and apply.
6. Run scheduler and verify outputs, pool, and uncovered demand sections.
7. Refresh browser to ensure persisted data restores correctly.

## Known open bugs — fix these first

1. **Sidur + forecast can't be uploaded together** — loading both files into
   the same workspace fails; the dual-ingest path needs root-causing.
2. **Workforce (כוח אדם וברזל) filter lists still don't populate in the real
   browser flow** — `populateWfFilters()`/`wfFilterValues()` and the A/J/N
   mapping are correct and pass in a Node harness, but the lists stay empty
   in-app. Debug in the browser, not just in Node (and mind stale localStorage).

## Notes for future agents

- There is no formal test suite or build tooling in this repo.
- Manual browser verification is the source of truth.
- For ingestion changes, a fast pre-check: extract the relevant functions from
  `index.html` (brace-matching on the source text) and run them in Node against
  the real `.xls` in the repo root — this exercises the shipped code, not a
  copy. A passing harness still does not replace an in-browser check.
- Users often test against a stale copy or cached page — a "bug reappeared"
  report may just mean the fix isn't in the file they opened. Confirm which
  copy/branch they're running before debugging.
- Prefer minimal, localized edits. In this codebase, broad refactors are high-risk.

## Git / PR conventions

- Branch from `main`; do not commit directly to `main`.
- Commit only when explicitly requested.
- PRs target `main`.
- Never commit the `.xls` workbook or other real employee data files.
