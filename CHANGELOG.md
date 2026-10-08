# CHANGELOG.md

All notable changes to this project will be documented in this file.

## Unreleased

### Added

- Matrix: cumulative "day so far" service (AR/TSF per the toggle) on every cell hover, and
  before → after in the cell editor, from the day's first interval to the hovered one.
- Settings → 🎧 Answering skills: one persisted choice shared by the matrix, recruitment and
  scheduler 🎧 buttons (all stay in sync). Every skill ever seen is remembered; a reloaded
  sidur keeps the choice instead of resetting to קו 1; a skill new to the workspace triggers
  a one-time notice. Empty state: the list arrives with the first sidur (all count until then).

- AHT forecasting: three new models in Settings → Forecasting Models, alongside the existing
  ones — calls-weighted exponential smoothing, day level × intraday shape (interval factor
  shrunk toward the day when calls are few, smoothed with neighbouring intervals), and a blend
  of the two; plus Holt damped trend. The AHT backtest is now calls-weighted (WAPE) and ranks
  AHT models by error. Default model unchanged (4-week average) until the backtest says otherwise.

### Changed

- Matrix color scale: green only at/above target, light green within 3 points of it; below
  that, the week's under-target intervals split into four equal groups (red = worst quarter;
  fixed bands when the week has too little spread to rank). The daily strip uses the same
  scale. Legend reduced to three words (on target · close · below, darker = look first);
  the exact cut-offs are on hover.
- Weekly matrix is a one-screen page: no page scroll. The grid fills the window (rows stretch
  on big screens; on smaller ones cells go to one line, then drop the small scheduled/needed
  line, which stays in the hover). Holiday/Exception control moved into the matrix toolbar.
- Cell editor opens above the cell when there is no room below and is always kept inside the
  viewport, so Apply/Cancel stay reachable on the last rows.
- Week chip on the matrix: shows an explicit "↩ this week" button part when it can jump; when
  the current week is outside the data, its hover says why and how to fix it.
- Matrix: the standing calibration sentence above the grid is gone. Problems show as a
  toolbar chip only when actionable (hover = what's wrong, click = where to fix it).
- Every dropdown (.splitbtn) opens and closes by click: a second click closes it, as do a
  click outside and Esc; checkbox lists stay open while ticking.

## Merged in PR #14

### Fixed

- Matrix cell editor showed and edited the forecast file's staffing baseline even when
  a loaded sidur drives the cell, so agent edits silently did nothing. Sidur-driven
  cells now edit a separate what-if count (see Added).
- Matrix: an understaffed dot next to an on-target % read as a contradiction. Now a
  hollow ring = "fewer than the model sizes for, yet service is on target" (solid dot =
  real shortfall); the tooltip says why (measured vs forecast, primary-metric mismatch).
- Home portals: loaded forecast/sidur status now says WHAT was loaded (forecast date
  range · days · intervals; sidur week + dates · reps · iron). Problem rows collapse to
  one amber line (hover = full reasons, click = skipped rows); first-use help hides once loaded.
- Date Trends in Hebrew: dates now line up on one edge (holiday rows were flexed to
  the opposite side), digits stay LTR, and the 🕎 badge trails the date in reading order.
- Legacy `.xls` reader: formula cells with string results (STRING records) are
  now read — Workforce filter lists (site/team/skill from cols A/J/N) populate
  from real Tikshuv workbooks.
- A loaded sidur's week now survives a later forecast upload (week selector no
  longer resets and empties the manpower pages).
- A sidur-only workspace (no forecast) is restored after refresh instead of
  being replaced by sample data.

### Added

- Auto-Scheduler shows its week at the top: Mode 1 (fine-tune) is pinned to the loaded
  sidur's week; Mode 2 (generate from iron) gets a week picker for any forecast week.
- Matrix what-if staffing on sidur cells: change the rep count to see the day/interval
  effect (sidur file and scheduler untouched, persisted); ✎ + ↺ per cell, one-line
  notice on the scheduler page, "⬇ What-if changes" CSV (sidur → what-if, service before → after).
- Date Trends: "Hours to schedule (gross)" column — the matrix's target-sized "needed"
  (incl. shrinkage + absence) × ½h per day; dates centered.
- Workforce: team/skill/site filters are multi-select checkbox menus; treemap labels
  are sized to fit their tile; drill-down rows expand to the reps behind each group;
  🏖 vacation headroom per weekday under the impact matrix; Internal Roster
  Optimization follows the filters, expands to all reps, shows iron-vs-sidur per day,
  and copies grouped by team.
- One toggle language app-wide: pill segmented controls (.seg) and switches (.sw) for on/off.

### Changed

- 📣 Planned demand events take one number (extra calls) — the customers × % helper was removed.

### Fixed (this batch)

- Trends/forecast: `requiredAgents` memoized for range sums (`requiredAgentsMemo`).

- Weekly matrix: a week-vs-today chip (📍 this week / ⏮ N weeks ago / ⏭ in N weeks,
  plus "actual through <day>, forecast after"); click it to jump back to the current
  week. Each day header is tagged actual / forecast / ● today, and today's column is framed.
- Date Trends: header and the סיכום row stay pinned while the rows scroll.
- Matrix cell editor: source chip (actual/forecast), a live "scheduled · needed · metric"
  mirror that previews the effect before Apply, and a one-line hint per field.
- 📣 Planned demand events (Settings → Forecasting Models): size a known one-off surge
  once (total extra calls, or customers × % who'll call), spread over N working days
  (front-loaded or even). It's added to the forecast, badged in Trends and the matrix,
  and those days are kept out of model learning once they become history. A one-line
  hint on Date Trends points to it.
- 📊 Intraday call weights (Settings → next to the interval-profile window): the
  weekday × half-hour share matrix, a window switch with a one-line insight on what
  changing it moves, a "change vs other window" view, and click-to-pin shares (the
  rest of the day rebalances to 100%; forecasts only).
- `data-i18n-ph` / `data-i18n-title` are now applied by `setLang`.
- TESTING.md documents the automated unit + headless-browser checks.
- Browser-tab icon (embedded data-URI favicon from `images.jpg`); same logo in the footer.
- Iron gating: SLA impact matrix, validation matrix and the auto-scheduler are
  visibly disabled (grayed + explanation) until a סידור ברזל is loaded.
- SLA impact matrix rewritten: compares Iron base staffing vs actual roster per
  skill × day, only for validated Iron agents; unvalidated agents listed under *;
  follows the primary target metric (TSF/AR) from Advanced Settings.
- Auto-scheduler builds strictly from the validated Iron base; uncovered demand
  (ביקוש לא מכוסה) renders as a classic sidur matrix (intervals × days); the
  on-screen schedule and CSV export use the exact Tikshuv sidur-avoda column
  structure (מוקד, כניסה, יציאה, תאריך, יום, שם הנציג/ה, שעות, סטאטוס, …).
- Course Gantt upload on the Recruitment page — forgiving ingestion (fuzzy HE/EN
  headers, any date format, defaults for missing duration/yield).
- Treemap drill-downs: click a tile to break it down by team / skill / site.
- Forecast data audit: flags answered>offered (impossible AR), AHT outliers and
  far-off dates; matrix shows a calibration note when AR/TSF are uncalibrated
  model estimates.

- Test suite: `tests/unit` (43 assertions over dates/times, ingestion, Erlang
  math, scheduler, real-workbook parsing — run `node --test tests/unit/*.test.js`)
  plus `tests/browser/smoke.js` E2E; tests extract the shipped functions
  directly from `index.html`. See `AUDIT_PLAN.md`.

### Changed

- Internal Roster Optimization moved from Recruitment to the Workforce & Iron page.
- Nav tab labels no longer carry emoji.
- Drag & drop audit: multi-file drops now ingest EVERY file (forecast + sidur in
  one gesture); dropzones are keyboard-accessible (Tab + Enter/Space);
  drop-anywhere overlay yields to portal highlighting; scheduler constraints
  input is now a dropzone (multi-sheet aware) instead of a bare file picker;
  home-page copy mentions Excel and the Tikshuv workbook flow.

- Initial documentation baseline:
  - DESGIN.md
  - CONTRIBUTING.md
  - TESTING.md
  - ARCHITECTURE.md
  - INGESTION_SPEC.md
  - TROUBLESHOOTING.md
  - DATA_PRIVACY.md

### Changed

- AGENTS.md refreshed to match current implementation.
- Removed outdated known-bugs section that no longer reflected the codebase.
