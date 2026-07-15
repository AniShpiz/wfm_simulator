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

### Workforce pipeline

roster/iron/meta -> computeWorkforce -> render KPIs + tables + treemap

### Scheduler pipeline

week demand + employee windows + optional constraints -> schedulerCore -> render outputs

## Rendering Strategy

- Pages render on demand.
- Dirty pages are marked and rendered when active.
- Heavy tables are chunked to reduce memory pressure.

## Persistence

- wfmSimWorkspace: settings and user workspace preferences
- wfmSimData: uploaded operational data and derived structures

## Design Constraints

- Keep all logic local in browser
- Keep zero dependencies
- Keep bilingual i18n parity
- Keep index.html as the single source
