# TESTING.md

Automated checks plus a manual checklist for this repository.

## Automated Checks (run before every merge)

Zero-dependency unit tests — they extract functions straight out of `index.html`
(`tests/extract.js`), so they exercise the shipped code:

```
node --test tests/unit/*.test.js
```

(60 tests: page integrity — the whole script parses + EN/HE key parity —, dates/times, ingestion, real .xls,
Erlang, scheduler, Friday rotation + own holidays. Run them after EVERY edit: a stray `//` that
comments out a brace breaks the whole app and only the page-integrity test sees it.)

Use the glob: passing the bare `tests/unit` directory fails on Windows.

Headless-browser scripts (load the real page, drive it, report `ok`/`not ok`):

```
node tests/browser/smoke.js
node tests/browser/forecast-logic.js
```

They need `puppeteer-core` (kept **outside** the repo — the app stays
zero-dependency) and Edge at `C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe`:

```
cd <any scratch folder> && npm i puppeteer-core@23
set NODE_PATH=<scratch folder>\node_modules      (PowerShell: $env:NODE_PATH="...")
```

Run them from a normal terminal (PowerShell/cmd). Sandboxed shells may be blocked
from launching the browser.

Automated checks do not replace the manual pass below for UI changes.

## Why Manual Too

Layout, RTL/LTR, and "does this make sense to a manager" can only be judged in a
real browser, in both languages.

## Test Environment

- Browser: latest Chrome or Edge
- Open app by double-clicking index.html
- Use fresh session when needed (incognito or cleared localStorage)

## Baseline Smoke Test

1. App loads with no console errors.
2. Navigation tabs switch correctly.
3. Language toggle changes text and direction.

## Ingestion Tests

### Forecast ingest

1. Drop CSV/Excel/JSON forecast file.
2. Confirm success status and toast.
3. Confirm matrix and trends populate.

### Roster ingest

1. Drop long-format roster.
2. Confirm status updates and capacity effects.
3. Confirm named roster behavior if names exist.

### Matrix roster ingest

1. Drop day x interval matrix roster.
2. Confirm inferred capacity blocks appear.

### Multi-sheet workbook

1. Drop real Tikshuv workbook sample.
2. Confirm Iron + roster pairing is recognized.
3. Confirm active week adjusts to data week.

## Matrix and Trends Tests

1. Change week forward/back.
2. Edit a matrix cell and apply.
3. Validate recalculated metrics.
4. Run trends export CSV.

## Workforce Tests

1. Open Workforce and Iron page.
2. Validate team/skill/site filter population.
3. Verify KPI updates when filters change.
4. Verify validation matrix content and exports.
5. Iron vs sidur by day: 6 columns, % under each, a day click opens its hours; fold → one-line
   summary, still folded after refresh.
6. Below their iron: reason chips (vacation / empty / no status…) filter the list.
7. Friday rotation (week-27 file): with no memory of the week before, Friday iron counts half
   and the Friday card offers last week's file; after a previous week's sidur (or its file in the
   drop box) the groups appear: two in a row / their turn / on / off / no longer active.

## Forecast & Trends Tests

1. Calm history → no 📈 anywhere (matrix week pill, Date Trends). Silence is the expected state.
2. A sustained jump in the last days (see `tests/unit/rotation-holidays.test.js` for the pure
   parts; the controlled surge CSV in the PR notes) → "📈 +N%" in the week pill and one line in
   Date Trends; the next working day ≈ model × level + callbacks; far days back to the model.
3. Date Trends 📊: hover shows one tooltip for all charts; clicking a week opens its days.
4. Holidays table → your own date (closed) → that forecast day is 0 and carries its name.

## Scheduler Tests

1. Run auto-scheduler with loaded data.
2. Validate optimized schedule table.
3. Validate overstaffing pool and uncovered demand sections.
4. Export optimized CSV.

## Persistence Tests

1. Load data and change settings.
2. Refresh browser.
3. Confirm workspace and data restore.
4. Use reset action and confirm cleanup.

## Regression Focus Areas

- Header synonym matching
- Week alignment after roster ingest
- Forecast cache invalidation after edits/settings changes
- Workforce filter option generation
- Scheduler constraint parsing
