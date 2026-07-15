# DESGIN.md

Project design guide for the WFM Simulator.

## Purpose

This file explains how to design features in this repository without breaking the core product constraints.

The app is intentionally:

- Single file
- Zero dependency
- Offline-first
- Browser-only

Any new design work should preserve those constraints.

## Product Design Principles

1. Keep one-screen clarity
Each page should present the main action first and supporting controls second.

2. Respect operational workflows
Design should match real call-center planning flow:

- ingest data
- validate quality
- review matrix and trends
- optimize staffing
- export decisions

3. Show confidence and limits
Whenever values are derived, expose context with labels, tooltips, or notes.

4. Keep manager-friendly language
Use direct operational wording instead of technical math terms in main UI.

5. Bilingual parity
Every new user-facing string must be added to both English and Hebrew dictionaries.

## UX Structure

Current top-level page model:

- Home
- Weekly Matrix
- Date Trends
- Workforce and Iron
- Auto-Scheduler
- Recruitment and Training
- Advanced Settings

Do not add new pages unless there is a clear workflow boundary.

## Visual Design Direction

- Keep dense but readable data layouts.
- Preserve table-first decision views.
- Keep color semantics stable:
  - good: green family
  - warning: amber family
  - bad: red family
- Do not introduce heavy visual themes that reduce readability.

## Interaction Design Rules

- Data-edit actions must be reversible.
- Forecast and roster ingest should remain drag-and-drop first.
- Export actions must stay one-click and explicit.
- Any critical reset action must require confirmation.

## State and Feedback Design

- Always provide success/error feedback after ingestion.
- Keep status messages in-page and also visible as toast.
- Avoid silent failures.

## Performance Design

- Prefer incremental rendering for large date ranges.
- Avoid expensive full rerenders when a single page changes.
- Keep memory use stable with bounded caches.

## Accessibility and Input

- Keep keyboard support for primary actions.
- Ensure focus-visible states are clear.
- Preserve RTL/LTR switching behavior.

## Definition of Done for Design Changes

A design change is done only if:

1. It works in both languages.
2. It does not break existing data flows.
3. It is understandable without extra training.
4. It keeps offline/single-file constraints.
5. It is validated with real ingest samples.
