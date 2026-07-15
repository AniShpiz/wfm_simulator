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

- Browser-tab icon (embedded data-URI favicon from `images.jpg`).

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
