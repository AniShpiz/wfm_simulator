# ARCHITECTURE.md

High-level architecture of the WFM Simulator.

## Runtime Model

Single-page, browser-only app in one file: index.html.

Main layers:

- Presentation: HTML sections + CSS
- Interaction: event handlers
- Domain logic: forecasting, queue math, scheduling
- Data ingestion: file decoding + normalization
- State/persistence: in-memory state + localStorage

## Main State

Central state object includes:

- settings and policy
- loaded day maps
- roster and iron structures
- forecast caches
- edits, exceptions, simulations
- filter selections

## Core Pipelines

### Ingestion pipeline

ingestFile -> bytesToGrid -> ingestRows -> build* -> renderAll

### Forecast pipeline

loaded history -> rebuildLearningSeries -> forecastDay -> computeDay

- rebuildLearningSeries also keeps `state.learnDates` (the date behind each week of a weekday
  series) and `state.domFactorPre` (billing calendar learned before the last 10 working days).
- forecastDay: daily model × billing × holiday × volCal, then the 📈 fast lane (`fastState` →
  `fastFor`): pre-window model × level L for the next days (fading by half every `fastHalf`
  working days) + callbacks of the last days' extra abandons; then planned events (📣).

### Workforce pipeline

roster/iron/meta -> computeWorkforce -> render KPIs + tables + treemap

- Every iron total reads Friday through the rotation: `friW(name, week)` (0 / 1 / 0.5) via
  `ironDayH` / `ironWeekH`; `settings.friHist` is the Friday memory filled by `recordFriHist`
  on every sidur upload (and `ingestFriOnly` for last week's file).
- Cards: `renderIronDays` (iron vs sidur by day), `renderFriday` (both Friday cards — scheduler
  step ① and inside the Iron validation card), `renderInternalRoster` (below-iron + reasons).

### Date Trends

trendDates -> trendDayStat -> (groupTrendRows) -> table + `renderTrendDash` (small multiples,
`trRelTile` relationship scatter). Same rows feed both, so they always agree.

### Scheduler pipeline

week demand + employee windows + optional constraints -> schedulerCore -> render outputs

## Rendering Strategy

- Pages render on demand.
- Dirty pages are marked and rendered when active.
- Heavy tables are chunked to reduce memory pressure.

## Persistence

- wfmSimWorkspace: settings and user workspace preferences — incl. `friHist` (Friday memory,
  names only, last 12 Fridays), `customHol`, `fastAdapt`/`fastHalf`/`retryShare`, `trDash`/
  `trCharts`/`trRel`, `fold` (which cards are folded)
- wfmSimData: uploaded operational data and derived structures

## Design Constraints

- Keep all logic local in browser
- Keep zero dependencies
- Keep bilingual i18n parity
- Keep index.html as the single source
