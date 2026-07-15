# CHANGELOG.md

All notable changes to this project will be documented in this file.

## Unreleased

### Fixed

- Legacy `.xls` reader: formula cells with string results (STRING records) are
  now read — Workforce filter lists (site/team/skill from cols A/J/N) populate
  from real Tikshuv workbooks.
- A loaded sidur's week now survives a later forecast upload (week selector no
  longer resets and empties the manpower pages).
- A sidur-only workspace (no forecast) is restored after refresh instead of
  being replaced by sample data.

### Added

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
