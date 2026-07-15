# CONTRIBUTING.md

Contribution guide for the WFM Simulator repository.

## Scope

This project is a single-file web app. Most code changes happen in index.html.

## Core Constraints

- Keep the app in one file: index.html
- Keep zero external dependencies
- Keep all processing in browser
- Keep offline operation by opening index.html directly

## Branching

- Create a branch from main
- Do not commit directly to main
- Open pull requests into main

## Change Style

- Make focused changes with minimal footprint
- Do not reformat unrelated sections
- Preserve the existing compact style

## User-Facing Text

For any new UI text:

1. Add English key/value in I18N.en
2. Add Hebrew key/value in I18N.he
3. Wire text through data-i18n or t()

## Data and Privacy

- Do not add network upload logic
- Do not add telemetry that sends user datasets
- Keep file parsing local

## Manual Validation Before PR

1. Open index.html in browser
2. Test forecast ingest
3. Test roster ingest
4. Test matrix rendering and edits
5. Test trends export
6. Test workforce filters and validation table
7. Test scheduler run and CSV export
8. Refresh page and validate state restore

## Pull Request Notes

Include:

- Problem statement
- What changed
- Risks and edge cases
- Manual test checklist and results
