# AGENTS.md

Guidance for AI agents working in this repository.

## What this repository is

This is a zero-dependency, single-file WFM simulator for an Israeli call center.
The full app lives in `index.html` (about 8k lines). It is pure client-side
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
- `TESTING.md`: automated checks (node unit tests + headless-browser scripts) and manual smoke steps
- `TROUBLESHOOTING.md`: known failure modes (stale localStorage, header errors)
- `DATA_PRIVACY.md`: local-processing guarantees
- `CONTRIBUTING.md`: constraints and branching
- `DESGIN.md` (sic): product design principles
- `CHANGELOG.md`: unreleased changes log — update it with your change

## Non-negotiable rules

- Meet the owner's bar in `DESGIN.md` → "The bar every change must clear": low cognitive load,
  power features one click deep, follow the user's journey, one applicative design, fewest clicks,
  value with minimum friction, **silence when all is well** (no notice that makes a healthy state
  feel broken), root cause over warnings, every secondary area folds.
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

- Skills are ONE list app-wide: the 🎧 answering skills (`settings.answerSkills` → `state.capSkills`
  = `state.schedSkills`), one menu builder `renderScopeMenu` for every 🎧 button (matrix, recruit,
  scheduler, Workforce `renderWfScope`) + Settings chips. `wfPass` applies it on the Workforce page
  (untagged reps always count). Never add a second skill filter.
- Workforce team/site filters are populated from both roster metadata and Iron data:
  - `wfFilterValues`
  - `populateWfFilters`
- Workforce KPIs and visuals:
  - `computeWorkforce`
  - `renderTreemap`
  - `renderIronDays` (iron vs sidur by day, people; folds)
  - `renderImpactMatrix`
  - `renderValidation`
  - `renderInternalRoster` ("Below their iron — who and why": reasons from the sidur, chip filter)
- Friday rotation (each rep works every other Friday; `settings.friEvery`): every iron total reads
  Friday through `friW` → `ironDayH`/`ironWeekH` (worked last Friday → 0, didn't → 1, unknown → ½).
  The Friday memory `settings.friHist` (names only, last 12 Fridays) is filled by `recordFriHist`
  on each sidur upload, or by `ingestFriOnly` (last week's file, Friday only). `renderFriday`
  draws every `.friCard` (Auto-Scheduler under step ① with `schWeek()`; inside the Iron validation
  card with `wfWeek()`). `repLeft` = the sidur says resigned / left / not active.
- Scheduler:
  - Mode 1 `optimizeSidur` (move-only: slides existing shifts ±2h) and Mode 2
    `generateIronBaseline` (greedy build from the iron base); toggle via `applySchedMode`
  - `schedulerCore` is legacy — no longer called by the app, only by
    `tests/unit/scheduler.test.js` (the live engines have no unit tests yet)
  - `runScheduler` and `renderSchedulerResults`
  - Optional constraints ingestion via `parseConstraintsGrid`

## Forecast extras

- ↩ Catch-up layer: learned in `rebuildLearningSeries` (`state.cuParam` {c,q}, `state.cuEvents`, `state.cuDays`
  kept out of learning) → `catchUpAt(ds,force)` added in `forecastDay` and taken out in `fastState`; `cuInfo` /
  `cuToggle` drive the matrix chip and `#trCu`; `state.cuCheck` (error without/with on past lost days) + the switch
  live in the backtest window. `settings.cuOn` (on unless false). 0 on a regular week.
- `settings.volCal` is retired (forced to 1 on load; no UI) — the fast lane owns level corrections.
- 📈 Fast lane for sudden demand changes: `fastState` (memoized on `_serVer` + settings) /
  `fastFor` inside `forecastDay`; `preDaily` = the daily model on history before the window;
  `domFactorPre` = billing calendar learned before the window. UI: only during a real shift —
  `.wkFast` inside the matrix week pill, `#trFast` in Date Trends; panel `openFast` (⚙ folded).
- Your own holidays: `settings.customHol` → `applyCustomHol` (wins over the Hebrew calendar,
  works with it off) and `customHolOn` (names); edited in the holidays table (`renderCustomHol`).
- Date Trends charts: `renderTrendDash` + `trRelTile`, fed by the same rows as the table.

## Forecast-week capacity (matrix + Date Trends)

- `capacityFor` order: optimized preview → what-if cell → sidur (dated, then weekly template) →
  for a forecast date with an iron: `ironCapAt` (today's team) × `lensScale` → else the file's
  history `rec.agents` (scaled by `lensScale` inside `forecastDay`).
- `lensFrom()` = the projection's day 0: today, or the first forecast day when the file ends before today.
- `settings.capLens`: "today" (default) | "real" — the single `.lensBtn` switch, rendered by
  `syncLens` on both pages, shown only for forecast days without a sidur.
- 🎓 `traineeAt(ds,di,tm)` from `state.trainees[Sunday]` ({n,s,e,days,pct}, saved with the data) is
  added in `computeDay` and `trendDayStat` only — never in the scheduler or the What-If.

## Recruitment & training

- Courses (`state.cohorts`, persisted with the workspace) live in ONE editable table
  (`renderCohortTable`); `addCourses` replaces a course with the same name + start.
- `parseCoursesGrid(grid, defaults)` returns the courses (any layout; carried-down hire rate /
  length; `courseDefaults()` = the remembered "hire % for new courses"). Files dropped anywhere on
  the page go to `ingestCourseFile`, which hands a forecast / sidur (by `findHeader` + `classifyGrid`, or iron /
  sidur sheet names) to `ingestFile`. `crsTemplateRows` = the template + the drop box's mini table.
- `hirePlan()` is memoized (`state._hpC`, keyed on courses + settings + `_crsVer`) → `hirePlanRaw`; `lensScale` per
  date (`state._lensC`). `cohortsChanged` bumps `state._crsVer`. Lanes: `settings.siteGroup` → `siteLane`;
  `courseOverlaps()` marks rows. 📄 `rcReportHtml` / `rcReport(fmt)`, sections `settings.repSec` (`REP_SECS`).
- `hirePlan` / `renderHirePlan` ("are your courses enough?") implement `RECRUIT_PLAN_SPEC.md` —
  read it before touching them. Course calendar: `courseDayOK` + `cohortFloorDate` (working days,
  closed holidays push; cached by `state._holVer`, bumped in `holChanged`). Locations: `SITES`,
  `courseSite`, `siteMax`, `siteLen`. The Trajectory decision line reads `hirePlan` — keep one source.
- Courses move forecast-day capacity via `hcScale` in `forecastDay` (only for dates after today).
- Undo: `crsSnap(msg)` / `state._crsUndo` ({prev, msg}) before a file drop, a ✕ or the plan's apply; the bar
  `#crsUndo` (in `renderCohortTable`); any other edit clears it (`cohortsChanged()`). `hirePlan().addFor` /
  `sug[].for` = the month each addition is for. Rules: `settings.siteMax` / `siteLen` (per location;
  `siteLen(s)` falls back to the median) and `settings.crsNoOverlap` → `siteLane` (ב"ש + רחובות share a lane).
- What-If / trajectory measure `wiSun()` (the first forecast week, else the last measured) via `wiRows`.
- Page order is CSS `order` on `#page-recruit` (kpis → `#trajCard` → `#whatIfCard` → `#crsCard` → the rest).

## ☕ Breaks tab

- `breakPlan(ds,over)`: reps from `schedRows` (else the iron's weekday, Friday via `friW`), each with
  their shift(s) and `5 × hours` minutes split into a long (= slot) + short break (`parts`), each in its
  own slot ≥ 90 min apart (60 / one slot when needed), inside the shift (`fits`). Tightest shifts first;
  each pair goes where the marginal loss of answered calls is smallest (`cost` = `evalInterval` +
  `slotBias`, interpolated). Spare = catch-up places (`s.spare`): inside short shifts first, then late.
  `over.flat` = the same breaks spread evenly (the "no planning" comparison).
- Bounds: `brkCfg(di)` (`settings.brk`: start, end, friEnd = 12:00, step 20, cap 6, spare 10 %) and
  `brkOpen(di)` = Settings `dayStart` / `dayEnd` / `friEnd` — no slot outside opening hours.
- `renderBreaks`: tiles, `brkAlts` (option tiles), `state._brkUndo` (the ↶ pill). The floor format:
  `brkSheetHtml(bp,mode)` (board · queue · flowchart; mode "tpl" blank | "names" filled) with `brkCell`;
  `brkExport(fmt,mode)` → pdf | word | xlsx (`xlsxBytes` cells may be `{v,s}` named styles) | text.
- Split: `parts(d)` = 60 / 40 in 5-minute steps (7h → 20 + 15, 10h → 30 + 20; < 30 min → one).

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

- No build tooling. Tests: `node --test tests/unit/*.test.js` (use the glob — a bare
  dir arg fails on Windows) and `node tests/browser/smoke.js` / `forecast-logic.js`
  (need `puppeteer-core` via `NODE_PATH` + Edge). See `TESTING.md`.
- Claude Code on this machine: the Bash tool's sandbox blocks launching Edge — run
  the browser scripts through the PowerShell tool. Write test scripts with the Write
  tool, not PowerShell `Set-Content` (it mangles the Hebrew repo path).
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
