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

## The bar every change must clear (owner's standard)

These come from the product owner and override taste. A feature that adds value but breaks one of
them is not done.

1. **Low cognitive load.** One idea per view. Managers read people ("29 reps"), not hours or model
   terms. Plain words first; the method lives behind an "i" or a folded "⚙ fine-tune".
2. **Power features, one click deep.** Depth is always there — hover = the period's numbers,
   click = open it (drill-down), fold/unfold a card — but never in the way of the main answer.
3. **Follow the user's journey.** Put a feature where the decision is made, not where the data
   lives: the Friday rotation sits where the sidur is built (Auto-Scheduler, step ①) and next to
   the iron lists (Iron validation card), not on a page of its own.
4. **One applicative design.** Reuse what exists: the Over/Under column shell, chips, pills,
   `details` fold cards, the `drl` people lists, the same palette and the same interactions. A new
   chart looks like it was always there.
5. **Fewest clicks.** Merge into an existing control instead of adding a button (the 📈 demand
   shift lives inside the week pill on the matrix). Remember choices (folds, chart picks, the
   Friday memory) so nothing is asked twice.
6. **Value with minimum confusion and friction.** Every screen answers "what do I do now" with the
   one number that matters.
7. **Silence when all is well.** Never show a notice, banner or chip that makes a healthy state feel
   broken — no "no shift detected", "not in memory yet", "filtered view…", "missing column"
   lines. Speak only when something real happened, in plain words with its number
   ("📈 calls rose 18% in the last 6 days — the next days are raised to match").
8. **Fix the root cause, never paper over it.** No ⚠ badges or heuristic data conversions to hide a
   suspicious number — trace it, reproduce it, fix the math.
9. **Every area can step aside.** Secondary cards fold to a one-line summary (e.g. "89% of the iron
   in the sidur") and stay folded across sessions.
10. **If it could confuse, it does.** Don't ship it and offer to fix it later — fix it. One concept =
    one control app-wide (the skills are the single 🎧 answering-skills list on every page, Workforce
    included). Two numbers for the same thing must match exactly, at the same precision.
11. **Explanations are short.** An "i" or a panel intro is two plain sentences at most: what
    happened / what it does, and what the user gets.
12. **One word per concept.** Staff who leave = "עזיבה"; "נטישה" is only for abandoned calls.
    A tool answers the user's question in its title ("Are your courses enough?"), the answer comes
    first, the knobs last.
13. **Same control, same place, same look.** A control that appears on several pages sits in the same spot on
    each ("Include attrition & courses" is at the far end of the toolbar, by the holidays / charts controls, on
    the matrix and on Date Trends) and every on/off switch is the same `.btn.sw` (gray off, navy on).
14. **No "i" icons on crowded pages** (the matrix): the explanation is the hover of the control it explains.

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
- Avoid noisy successes too: a calm state shows nothing (rule 7 above). Status colors (amber/red)
  are for real problems only; informational lines use the sky/navy family.

## Charts

- Small multiples: one metric per chart, ONE axis each (never dual-axis), shared time axis.
- Hover shows every metric of the period (one crosshair across all charts); click opens it.
- Forecast periods: lighter bars / dashed line on a pale band — never mixed into "evidence"
  (relationship scatters use actual periods only).
- The table stays the accessible twin of every chart.

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
6. It clears "The bar every change must clear" at the top of this file.
