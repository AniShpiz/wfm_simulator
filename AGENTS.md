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
  feel broken; a notice only when the user can act, knows how, one click away), root cause over warnings,
  every secondary area folds, **design from where the user stands in the journey and in time** (history in
  the file · the gap to today · the future — every number says which), **words last** (visual first; weigh
  every word; titles are the user's question).
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
- Workforce KPIs and visuals (iron = in the sidur + on leave + can come back):
  - `computeWorkforce` (KPI ① in the sidur ÷ iron, ② on leave + who/why in `#wfKpiLeakS`)
  - `ironGap()` = who is below their iron (page filters + day): `rec` = hours that can come back (no leave behind
    them), `abs` = explained by leave. KPI ③ `#wfKpiRec` (click → the card) and the "Below their iron" card both
    read it — one number. Hours print through `hU(v)` ("8.5h" / "8.5 ש׳").
  - `renderTreemap` (tile % = share of the IRON, like KPI ①; folds, `#treeSum`)
  - `renderIronDays` (iron vs sidur by day, people; folds)
  - `renderImpactMatrix` (folds; `#impSum` = the day leave hurts most) + `renderHeadroom` (+k can be off · −k missing)
  - `renderValidation`
  - 🔍 `renderIronChanges` ("What changed in the iron?", `#wfIronChg`, silent when nothing did): `settings.ironHist` =
    one snapshot per WEEK of the file's sidur (`recordIronHist(sidurWeek())` in `parseTikshuvWorkbook`; `state.iron.wk`;
    the latest file of a week replaces it, week order, a week equal to the one before keeps nothing, last 12 changes) —
    alternating this/next week's files never flips it. `ironChanges()` = the loaded iron's week vs the week before, per rep and day: down / up / del / add / move / new / gone.
    Multi-select kind chips, a key, groups per team manager with a trend line of its iron hours (`spark`), and a
    `tlMsg` per manager; before ← after reads in the page's direction. Test: `tests/unit/iron-history.test.js`.
  - `renderInternalRoster` ("Below their iron — who and why": reasons from the sidur; multi-select reason chips
    `state._rrWhy` (a Set); a legend for the bar + day colors; "Copy list" = one `tlMsg` per team, each rep then a line
    per day with what can be added and why — only the chosen reasons' days when chips are on)
  - `renderHeadroom`: a rep with an EMPTY cell that day (sidur still being filled) counts at their iron hours; Friday
    only if due by the rotation (`friW`=1). Typed statuses / leave = not coming.
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
  - `runScheduler` and `renderSchedulerResults`; the banner `schDoneMsg(out,gen)` and the KPI read `weekShortage`
    (`explainDay` rounds each half hour to whole reps, like the Uncovered-Demand grid) — one shortage number.
  - Messages to team managers: `tlMsg(team,purpose,lines)` — the one shape (hi · purpose · "• rep — …" · thanks)
    for scheduler changes, extension requests, iron validation and the Friday lists.
  - Constraints (both modes) via `parseConstraintsGrid`: long format, or the managers' grid (`parseConMatrix`,
    `conCell`: a cell = when the rep CAN work; the template comes filled with the iron shift — unchanged = nothing,
    emptied = can't, `xlsxBytes({protect})` locks all but the "ed" cells). `conMerge` = a file replaces only its own reps. `conTemplate` =
    the plain grid; `conPerRep` (settings.conPerRep, 2) + `conPlan` (each team's week by day room) → `renderConSum`
    speaks only when over. Enforced: `conMerge` keeps a rep's first X changed days (`state._conCut` = the rest); the
    file refuses a change beyond X (data validation vs hidden locked originals J:O) and paints a row over X red.
  - Split shifts: the iron day keeps every part (`w.parts`, `ironParts(w)`; `w.s`/`w.e` = the first, `w.h` = all).
    Capacity, breaks, the template and Mode 2 read the parts; Mode 2 keeps a split at its iron hours (`fixedParts`). Mode 2 honours windows (`segsOf` / `fitWin` in `generateIronBaseline`).
  - "⚙ Before running" (`#schPrep`): the Friday card `#wfFriCard` (data-wk="sch") is a REQUIRED part only in Mode 2
    while last Friday is unknown; "every Friday" leaves its switch. Only "Required" is tagged.

## Forecast extras

- ↩ The days after a lost day keep teaching WITHOUT their comeback calls: `state.cuAmt` (ds → calls, min(model, the day's rise
  over normal); computed with ↩ off too, applied only on) — `catchUpAt` of a past day returns it; `cuLearnNote()` = the switch's hover line.
- ↩ Catch-up layer: learned in `rebuildLearningSeries` (`state.cuParam` {c,q}, `state.cuEvents`, `state.cuDays`
  kept out of learning) → `catchUpAt(ds,force)` added in `forecastDay` and taken out in `fastState`; `cuInfo` /
  `cuToggle` drive ONE switch `.cuBtn` (`syncCu(page,dates)`, matrix + Date Trends, before the lens; ALWAYS shown when forecast days are on screen — the hover says what it does + the numbers while
  returning calls touch the days on screen) + a "↩ +n" mark on each affected Trends day (no sentence line; `#trCu` stays hidden); `state.cuCheck` (error without/with on past lost days) + the switch
  live in the backtest window. `settings.cuOn` (on unless false). 0 on a regular week.
- `settings.volCal` is retired (forced to 1 on load; no UI) — the fast lane owns level corrections.
- 📈 Fast lane for sudden demand changes: `fastState` (memoized on `_serVer` + settings) /
  `fastFor` inside `forecastDay`; `preDaily` = the daily model on history before the window;
  `domFactorPre` = billing calendar learned before the window. UI: only during a real shift —
  `.wkFast` inside the matrix week pill, `#trFast` in Date Trends; panel `openFast` (⚙ folded).
- Your own holidays: `settings.customHol` → `applyCustomHol` (wins over the Hebrew calendar,
  works with it off) and `customHolOn` (names); edited in the holidays table (`renderCustomHol`).
- Date Trends charts: `renderTrendDash` + `trRelTile`, fed by the same rows as the table.
- 📤 Monthly summary (`openShare` → `#shPanel`, title key `shWinT`): `shareMonths` → `shareInsights` (forecast lines about
  `tag==="fc"` months only; courses = one line) → `shareCanvas` (no status column: forecast rows lighter under a dashed line,
  the mixed month "*", the target bar; every canvas string through `cvDir` — a canvas drops isolates) + `shareText`
  (WhatsApp: *title*, 🟢🟡🔴 per month). Columns = `SHARE_METRICS`; options folded in `#shOptsD` (`shareOpts().open`).
- 📅 `renderSidurChip()` (in `renderAll`): the header chip `#sidurChip` = `sidurWeek()` (the loaded sidur's first date)
  + where it stands vs today's week; the ONE place every page shows which sidur is loaded. Click → Home.
- 📈 Forecast-day productivity in `trendDayStat`: answered = Σ vol × the matrix's AR, capped at net hours × 3600 ×
  `occMaxHist()` ÷ AHT; net hours = scheduled (capacity) × `prodBacktest().rho` (else × availability). The carry /
  ratio pick below no longer drives forecast days (only ρ is used).
- 🧪 `prodBacktest()`: the forecast's NET (login) hours, two ways tested on the file's past (each day predicted only
  from the days before it): "carry" (last 4 same weekdays) vs "ratio" (scheduled hours × login÷scheduled of the 8 weeks
  before). The lower error wins and `trendDayStat` uses it on forecast days; the productivity / net-hours header hover
  says which and why. Net hours now show on forecast days too (projected). Test: `tests/unit/productivity.test.js`.
- 🤖 `autoPickModels()` (after each forecast load): every volume / AHT / MPT model is ranked by `rankModels` (= the
  🧪 backtest window's ranking) and the best is used unless that list was picked by hand (`settings.modelUser[key]`,
  per list — `mUser(key)`; the old single `modelUserSet` only seeds it on load); the model lists start with
  "🤖 Automatic — <model>" (value "auto") to give the choice back.
- ↩ `state.rtParam` {p,q,r0,n,check,guard,known,X} (learned in `rebuildLearningSeries` next to the catch-up): the share
  of EXTRA abandoned calls (over the usual rate r0) that call again and how they split over the next 2 working days;
  shrunk toward 40% · ¾+¼; worse on the past → `guard` (p=0). `settings.retryKnown` (optional field in Settings) =
  a known p. `retryAt(ds)` adds it in `forecastDay` (history days too, for the split bar) under the same ↩ switch as
  `catchUpAt`; the fast lane takes it out before measuring its level and no longer adds callbacks itself (the
  manual `retryShare` slider is gone). Trends: `trRet` → the volume bar's hatched "returning" layer + its key + hover.
  Next stage (not built): the loop — forecast abandonment → returns on the following forecast days.
- ↩ the CAUSE: `retCause(ds)` = what a past day sends back (a lost day's `g.lost×c` + its extra abandons `X×p`, ≥3% of the
  day). Marked with a blue ▲ (`.retCauseMk` in the Trends volume + answer-rate charts, `.retCauseTag` in the Trends date
  cell and the matrix daily row); the effect = hatched blue: the charts' layer (`trRet`) and ONE tag `retPill(ds,n)`
  ("↩ +n", hatched) in the Trends date cell and the matrix daily row — history days too (the day after an outage).
  `retShown(ds,vol)` = the same rule as the cause (≥3% of the day or 20 calls), else 0 — no trace marks. `retSrc(ds)` =
  the day that sent them (the tag's hover). The matrix key `#mxRetLeg` shows only with its marks.
- 📊 `profBacktest()` (memoized on `_serVer`): the interval-profile windows (8w adaptive · 12w) tested on the last 8
  learning days per weekday, each spread from the days before it (`profileShares(di,mode,cut)`); error = % of the
  day's calls in the wrong half hour. `profMode()` = the window in use: the lower error unless `settings.profUserSet`
  (`profileMode` "auto" | "adaptive" | "w12"). Shown in the 📊 panel (`#profTest`), the 🧪 window and the list's hover.
- Settings › Forecasting models (`.fmCard`): a row with a list stacks (name above, the list full width); the 🤖 option
  shows the model's short name (the full one on hover).
- Settings › Forecasting models: one list of switches (holidays · war/outage · 📈 fast lane · ↩ returning calls
  `#setCuOn` = the same `settings.cuOn` as every `.cuBtn`, synced both ways via `cuToggle` → `syncCleanUI`) + the
  optional `#setRetryKnown` under it; the models fold (the patience row only when the file has MPT data). The 🧪
  window ("How accurate is the forecast?") = results in plain words via `rankModels`, the model in use first, the rest
  folded — no switch inside.
- Date Trends table: the TSF column = Settings' window (`metricTsfDyn`, the matrix's TSF; `mLab` in the charts);
  TSF 60 stays as a labeled benchmark (hidden when the window is 60). Only the primary metric's column is tinted;
  the last column is the target bar (`goalCell`: 0–100% fill, navy tick at the target, "−x%" or ✓).

## Forecast-week capacity (matrix + Date Trends)

- `capacityFor` order: optimized preview → what-if cell → sidur (dated, then weekly template) →
  for a forecast date with an iron: `ironCapAt` (today's team) × `lensScale` → else the file's
  history `rec.agents` (scaled by `lensScale` inside `forecastDay`).
- `lensFrom()` = the projection's day 0: today, or the first forecast day when the file ends before today.
- 🧭 The page toolbar (`.toolbar.tbBar`, matrix + Date Trends) = three `.tbZone`s (DESGIN rule 22); `.tbEnd` = the shared end
  zone (↩ `.cuBtn` · `.lensBtn` · … · `.moreBtn` ⋯). A switch = `<span class="swI">icon</span><span class="swL">name</span>`; an
  `@container` rule hides `.swL` on a narrow row (its hover starts with the name). `edChip(id,n,show,tip)` = the "✎ n"
  edits chip (`#mxEdits`, `#trEdits`). Holidays mode: `setExcMode` (on from ⋯ `#excModeOn`, the row's `#excModeBtn` = off).
  The week list: `wkOptTxt` ("Week 27 · 05-Jul", an LTR embedding — a <select> drops isolates) in `<optgroup>`s per
  time zone (wkGrpAct / wkGrpFc / wkGrpOut). `.splitbtn[hidden]` must stay display:none.
- `settings.capLens`: "today" (default) | "real" — the single `.lensBtn` switch, rendered by
  `syncLens` on both pages, ALWAYS shown in the same place (it acts on forecast days without a sidur — its hover says so).
- 🎓 `traineeAt(ds,di,tm)` from `state.trainees[Sunday]` ({n,s,e,days,pct}, saved with the data) is
  added in `computeDay` and `trendDayStat` only — never in the scheduler or the What-If.

## Recruitment & training

- Courses (`state.cohorts`, persisted with the workspace) live in ONE editable table
  (`renderCohortTable`); `addCourses` replaces a course with the same name + start.
- A course = {name, site, count?, start, duration, yield, req?}: `count` = reps recruited (empty = not yet), `req` = the
  recruiting target ("דרישת גיוס"; empty = `siteMax(site)`). Every number reads `crsReps(c)` (started → count; ahead →
  max(count, req); neither → class size) — never `c.count` directly. The plan's apply raises `req`. `K.req` in
  `parseCoursesGrid` is picked before the reps (its header also says "גיוס").
- `parseCoursesGrid(grid, defaults)` returns the courses (any layout; carried-down hire rate /
  length; `courseDefaults()` = the remembered "hire % for new courses"). Files dropped anywhere on
  the page go to `ingestCourseFile`, which hands a forecast / sidur (by `findHeader` + `classifyGrid`, or iron /
  sidur sheet names) to `ingestFile`. `crsTemplateRows` = the template + the drop box's mini table.
- `scopeHc()` = today's reps in the 🎧 skills (+ the course filter) — the plan, the What-If, the lens and the report
  start from it. `normCourse(c)` runs in `cohortsChanged` and on load (no empty fields reach the math).
  `whatIfCurve(wi,extra)` (extra = planned courses); `shadowPrices(full)` (levers incl. `availPts`).
- `hirePlan(sc)`: `sc` = `wiScenario()` (the What-If levers, null at 0) — AHT × (1−cut), shrinkage / absence / attrition
  cut; memoized per scenario. `histProductivity()` → `mo.Np` (the productivity check in a month's numbers).
- `hirePlan()` key = `siteRules()` (not the raw setting) — else every first open computed it twice; `hirePlanRaw` reads
  each forecast day once per data key (`state._hpDays`, shared by the lever checks); `warmPlan()` (renderAll) computes it
  when idle. A row's `reqEff` is 0, never undefined, for a half hour with no calls.
- `hirePlan()` is memoized (`state._hpC`, keyed on courses + settings + `_crsVer`) → `hirePlanRaw`; `lensScale` per
  date (`state._lensC`). `cohortsChanged` bumps `state._crsVer`. Lanes: `settings.siteRules` ([[location…]…], chip rows) → `siteLane`;
  `courseOverlaps()` marks rows. 📄 `rcReportHtml` / `rcReport(fmt)`, sections `settings.repSec` (`REP_SECS`).
  `rcReport` always builds with the "realistic" lens (attrition + courses), then restores the screen's lens.
  On paper: `d5` = dd/mm (no year, no direction marks); portrait A4 36pt (`WordSection1`); the Gantt's course cell =
  `.n1` name · `.n2` location · people · `.n2` range + `.sth` historical / `.stn` active now; the Gantt is last, on its
  own page, followed by the course list (inline styles — Word drops most selectors). Word: every cell gets `dir="rtl"`
  in Hebrew (Word reads cells LTR otherwise) and `wordMarks` turns isolates into RLM + LTR span + RLM. Verify a Word
  change in Word itself (COM: Documents.Open → SaveAs2 PDF; Range.Information(5) = a character's x) — the browser lies
  about it (test: `tests/browser/report-format.js`). The Gantt
  fills each week cell by days (start day → last day), a gradient in print, the whole cell in Word.
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
- 💲 `WI_LEVERS` = the four What-If sliders (ahtCut, attrCut, shrinkCut, absCut) — the shadow price lists exactly them;
  a lever at 0% in Settings reads "nothing to improve". `#wiReset` shows only while `wiScenario()` (a slider moved).

## Dates and pickers (app-wide)

- Display: `fmtD(ds)` = 05-Jul-2026 / 05-יולי-2026 (LRI…PDI isolate + an LRM after the month), `fmtDs` = 05-Jul.
  Files Excel reads: `fmtDx` = 05/07/2026 (tikshuvRow, the analyst copy, CSV exports, the course + constraints
  templates). `csvQuote` strips the direction marks; the Trends CSV writes `fmtDx` from `.trDate[data-ds]`.
- `dpUpgrade(root)` turns every `input[type=date]` (and new ones, via a MutationObserver) into the one picker: the input
  hides (`.dpOn`) and keeps the value + its change listeners; `.dpBtn` shows `fmtD`; `dpOpen` / `dpPaint` / `dpPick`
  draw the month in `#dpPop`. `data-reco` + `data-reco-l` = a quiet suggestion (the plan date's forecast end).
- 👥 Matrix "who should be on": the reps number in a cell (`.whoLnk`, only with a sidur or an iron) → `openWho(ds,tm)`;
  `whoOn(ds,tm)` = the day's sidur (`schedRows`), else the iron's weekday (Friday via `friW`, leave out), 🎧 skills like
  capacity. Tick who isn't on the floor (`state._whoMiss`, session only) → "missing m of n" + the half hour's rate
  without them (`evalInterval` delta on the shown value) + 📋 one `tlMsg` per team. Silent until someone is ticked.
- ⏱ Matrix time marks: `mxTimeMarks()` (end of `renderMatrixBody`, every minute, on `visibilitychange`; a new day → `renderMatrix`):
  cells carry `data-ds` / `data-tm`; only in the week that holds today — `.mxPast` (washed out, `td.cell` + the daily row), `.mxNow`
  (sky ring + `--nowP` elapsed line; the row header `th.nowHd`); keys `#mxNowLeg` / `#mxPastLeg` only with their marks.
- Matrix: hover = a crosshair (row + column + both headers, `.xh` / `.xhc`); a cell's tooltip = only what the cell doesn't show:
  the day so far up to its half hour (`mxCum`), a sentence only when the marks seem to contradict the %, trainees; the cumulative line ends at the interval's end (`addHalf`).
- 📅 `planTo()` (settings.planTo, else `planToAuto()` = the forecast's end, 30 days … 6 months): the What-If curve,
  the capacity outlook, `hirePlanRaw`'s months and the report all run to it. `shAbs(k,v)` = a lever step in plain numbers.
- Course rules: `siteAtOnce(s)` (settings.siteAtOnce, 1) = courses a location runs together; `courseOverlaps()`
  returns {n, why:"site"|"rule", s}; `crsPeak` counts concurrency.
- Page order is CSS `order` on `#page-recruit` (kpis → `#trajCard` → `#whatIfCard` → `#crsCard` → the rest).

## ☕ Breaks tab

- Exports: `brkSheetHtml(bp,mode)` mode tpl | names (board + `brkEntitle(ds)` list + queue) | proc (the flowchart
  alone); `brkParts(d)` = the long/short split shared with the plan. Black & white on purpose.
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
- Split: `brkParts(d)` = breaks of at most `brkMaxRun()` minutes in a row (settings.brk.maxRun, 20), even in
  5-minute steps (`brkSplit`): 7h → 20 + 15, 8h → 20 + 20, 10h → 20 + 15 + 15. `brkLS` = bold when they differ.
- Print: `brkSheetHtml` fits the board on one landscape A4 (font by cap, row height by slots, `.bdw` zooms itself;
  its inline script must write `<\/script>`); `xlsxBytes(rows,{print:{land,brk}})` = Excel page setup.

## Persistence and reset behavior

- `saveState`/`loadState` persist settings/policy/courses/injections/language.
- `saveData`/`loadData` persist uploaded datasets and derived operational structures.
- 📅 `wfmSimNow` = THIS WEEK's sidur, kept for the matrix while another week is loaded (`keepNowSidur` in `renderAll`:
  copies the loaded sidur's days of today's week — cap, cap by skill, shifts; drops it once the week is over). Read only
  through `nowSidOn(ds)` (a day the loaded sidur doesn't cover) in `capacityFor` / `skillCountAt` / `capSource` and
  `sidurRowsOn(ds)` (👥 `whoOn`, ☕ `breakPlan` / `brkEntitle`); the chip shows "27 · this week" (`.scKeep`, click → matrix).
  Planning pages (Workforce, scheduler) never read it. ⛓ `ironEmpsFor(ds)` = the iron in effect that week (latest `ironHist` week ≤ ds; else the loaded
  iron) — `ironCapAt` (per-week cache by reference) and the 👥 / ☕ iron fallbacks; `ironNewerWk()` → the chip's hover. Test: `tests/unit/this-week-sidur.test.js` + `tests/browser/this-week-sidur.js`.
- A single-sheet sidur with names + start/end runs `walkRosterExtras` too; other sidurim `dropRosterRows()` — the shifts
  always belong to the file just loaded.
- Workspace reset action clears the persisted layers (incl. `wfmSimNow`) and restores defaults.

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
