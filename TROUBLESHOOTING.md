# TROUBLESHOOTING.md

Common issues and fixes.

## App shows stale data after changes

Cause:
localStorage persistence restored old workspace/data state.

Fix:
- Use in-app workspace reset
- Or clear browser localStorage for the file origin and reload

## File ingest fails with header error

Cause:
Header row not detected from provided columns.

Fix:
- Ensure expected columns exist (date/time/volume/aht for forecast)
- Remove decorative title rows when possible
- Re-export file as clean CSV/XLSX

## Roster appears loaded but matrix does not change

Cause:
Date range may not overlap active forecast horizon.

Fix:
- Check week selector
- Confirm roster date overlap with loaded forecast dates

## Workforce filters are empty

Cause:
No team/skill/site metadata found in loaded roster/iron sources.

Fix:
- Verify source has those columns
- Re-ingest workbook that includes metadata

## Scheduler generates no assignments

Cause:
Insufficient demand/employee windows/valid week data.

Fix:
- Confirm active week has computed demand
- Confirm Iron or fallback employee source exists
- Re-check optional constraints file for parse issues

## Language switch looks partial

Cause:
New UI string not wired to i18n keys.

Fix:
- Add key in both I18N.en and I18N.he
- Use data-i18n or t() where rendered

## Performance becomes slow on large ranges

Cause:
Very large historical ranges increase render and memory load.

Fix:
- Use shorter trend range while validating
- Refresh page after major ingest cycles
