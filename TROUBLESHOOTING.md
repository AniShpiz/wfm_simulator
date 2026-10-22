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

## Friday utilization looks off / the Friday card asks for last week's file

Cause:
Each rep works every other Friday. Until last Friday is in memory, Friday iron counts half.

Fix:
- Upload last week's sidur once (or drop it in the Friday card — only its Friday is read)
- A center where everyone works every Friday: switch the card to "Every Friday"

## No 📈 on the matrix even though a campaign started

Cause:
The fast lane speaks only when the shift is clear: ≥6% and the last 3 working days on the same
side. A one-day spike is noise; a planned surge belongs in 📣 Planned demand events.

Fix:
- Advanced Settings → Forecasting models → 📈 ⚙ shows the last 10 days against the forecast

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
