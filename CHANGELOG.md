# CHANGELOG.md

All notable changes to this project will be documented in this file.

## Unreleased

### 🔧 The report says a scenario as a condition; months carry their year

- The executive report's scenario line is a condition, in its own box: "Provided that this is achieved — shorter
  calls 10% · less attrition 50% — the courses need +5 (without the improvement: +14)", plus "a scenario, not a
  forecast: it holds only if the improvement really happens". It names its levers, so it stands without the
  What-If section.
- Months carry their year in the plan and the trajectory line ("Dec 2026", "for Nov 2026"); the short-months
  line keeps each number readable in Hebrew ("Oct 2026: −42").

### 🔧 The What-If levers as a scenario for "are your courses enough?"

- Move a What-If lever (shorter calls, less attrition, less shrinkage, fewer no-shows) and the plan runs on it
  when you let go: a chip names the scenario, the number says it against the real one ("+5 … (instead of +14
  without it)"), and the button says "— by this scenario". "↺ Back to current" clears it. The real plan (the
  trajectory line, the report's plan) stays the real one; the report adds the scenario in one line.
- A month's numbers carry a check by the history's productivity (the file's answered × AHT per scheduled rep, last
  8 weeks — shrinkage already inside): "~129 needed" next to Erlang's 143 (peaks need more than an average).

### 🎓 Course rules in plain words; short months explained

- "Not at the same time" = rules: a row of location chips each — the lit ones never run a course together (two,
  three, any); "+ another rule"; ✕ removes. The same rule twice, or one inside a bigger one, isn't kept (a line
  says so). Replaces the group letters; earlier settings carry over.
- The months the additions can't close: one red line with what each still lacks ("Oct −42 · Nov −32"), then why
  (full courses / the first new course's date) and what helps (shorter courses, bigger classes).
- "Work days" → "Course days" (the table, the rules, the template; the file reader knows both).

### 🎓 A forecast or a sidur dropped on the Recruitment page loads as what it is

- Fix (root cause): every file dropped on the Recruitment page went to the course reader, which finds
  "courses" in almost any table — a forecast loaded as courses. A file whose header reads as a forecast or a
  sidur (or a workbook with iron / sidur sheets) now goes to the regular import; only the rest is read as courses.

### 🎓 Courses page: fast, clearer, rules for any locations, an executive report; breaks read the matrix

- Speed: with "include attrition & courses" on, every half-hour cell re-ran the headcount projection (15k
  projections and 63k course-end dates per change) — one per date now; "are your courses enough?" is worked out
  once per change (the plan box and the trajectory line share it); the hiring search is a binary search.
  A course edit / ✕: ~370 ms → ~160 ms on the test machine.
- "Are your courses enough?" judges a month on its AVERAGE (weekly points), not a snapshot on the 15th: a course
  that graduates on the 17th now counts for the rest of the month, so a shorter course moves the plan.
- "Not at the same time" for any set of locations: a group letter (א/ב/ג) per location in ⚙ Course rules; a
  course that runs at the same time as another in its lane is marked on its row (with which one).
- Hovering a suggested addition lights up its course in the table. The rows read right in Hebrew:
  "+4 · סה״כ 12 (מלא) · בשביל דצמ׳" (no arrows between numbers).
- 📄 Executive report (in the trajectory card's title row — a click there never folds the card): tick the
  sections — the numbers, the decision, month by month (Date Trends' monthly rows: calls, answer rate, AHT, gross
  hours, days at target), the plan month by month + what to add, the courses Gantt, reaching the target (What-If,
  levers as set), the headcount outlook, the course rules — then PDF (print) or Word. RTL, tables only. Each section carries, grey in brackets, how it is
  worked out (the formula in words). The top
  line names the answering skills counted and whether forecast weeks include attrition & courses.
- Breaks: the day's answer rate starts from the matrix's own number for that day (its calibration already
  carries the usual breaks) and moves by what the planning gains ("▲ 0.2% above the forecast"); a chip shows the loaded sidur week (off its
  week: one click goes there).
- Workforce: the iron validation matrix folds to its title like "iron vs sidur — by day" (remembered; folded it
  keeps the count to check).

### ↩ Calls come back after a lost day (elections, a closure, an outage)

- New layer on top of the forecast models (they stay as they were): after a closed day or a day far under
  normal, part of its calls come back over the next working days, fading — the share and the fade learned from
  your own history (½ · ½ while it is short); a short day (Friday) takes back in its own size. On a regular
  week it adds exactly 0. The comeback days no longer teach the normal week (next Wednesday stopped inheriting
  last Wednesday's bounce), and the 📈 fast lane no longer reads a comeback as a level shift.
- Nothing to know or switch on: when it is at work, the matrix week pill says "↩ +1,335 returning calls"
  (hover: the date and the first days) and Date Trends says it in one line; one click shows the forecast
  without them (the regular model), again = back. No switch to find in Settings; the backtest (⚙ Models & checks) shows it on your own history — the
  next days' error after past lost days without / with it — with its on/off (off = the old models exactly).
  Honest note: off also puts the comeback days back into learning, so "on" is not zero on a regular week.
- Fix (root cause): the anomaly check ran on the days the PREVIOUS rebuild had excluded, so a flagged day
  (an election day) dropped out of its own check, came back un-flagged and taught the series — on every other
  rebuild. Each rebuild now measures fresh.
- The week-pill chips (📈 / ↩) take the pill's own color — they were navy on the navy "this week" pill.

### ⚙ Settings: the manual forecast calibration is retired; the model machinery folds

- The backtest's "⚙ Apply N% calibration" (a hidden multiplier on every forecast) is gone: the 📈 fast lane
  already follows a real shift in the demand level, so the two double-corrected. A saved calibration goes back
  to 100% on load. The backtest still shows the daily pace, with one line pointing at the fast lane.
- Forecasting Models card: in view = the holiday calendar, 📈 follow sudden changes, the holidays table,
  planned events. Folded under "⚙ Models & checks" = the three model picks, the interval profile window,
  war/outage detection, the backtest and the excluded days.

### 🎓 Training pipeline: the page's decision, honest, every change undoable

- Recruitment page order: trajectory insights (fold, remembered) → What-If → the training pipeline (full
  width: the courses table and "are your courses enough?" side by side) → the recruitment simulation with the
  capacity outlook beside it — the courses sit between the two charts they feed.
- ⚙ Course rules (under the plan): class size and course length per location — a shorter course applies to
  that location's upcoming courses at once (undoable) and to every course the plan suggests; "ב״ש and
  רחובות never at the same time" makes the two share one course lane.
- Fix (root cause): a course file with the app's own header "ימי עבודה" lost every course's length (all
  became 12) — the length header now matches.
- Fix (root cause): the What-If and the trajectory measured the last week in the forecast file, whose agents
  are who answered (no skill split) — the 🎧 answering scope moved nothing. They now measure the first forecast
  week with today's team from the iron, in the scope, like the matrix (with the slot anchor — the same number).
- Fix (root cause): "Include attrition & courses" changed nothing when the forecast file ends before today
  (e.g. data to June, forecast July–September): the projection counted days from today, so those months were
  "0 days ahead". It now counts from the first forecast day when that is before today (`lensFrom`).
- One undo for every change to the courses — a course file dropped (new + updated), a course removed (✕),
  the plan applied: "✓ what changed · ↶ Undo" above the table brings the courses back exactly.
- The plan says what each addition is for ("→ Dec") and, in one red line under the number, the months no
  course can reach in time with the earliest graduation date. The trajectory line no longer promises
  "every month" when some months can't be reached.

### ☕ The center's own break sheet; template or auto-assigned

- Export = the floor's format (landscape, RTL): ① the board — a row per slot, "place 1…N" columns of
  name + minutes, unused places "blocked" (grey), catch-up places yellow; date + opening / closing
  supervisor lines; ② the owed-break queue (#, name, priority 1 / 2, placed at); ③ the delayed-break
  flowchart. Word and PDF carry all three pages; Excel (.xlsx) carries the board with its colors and merges.
- The export menu splits in two: 📋 Template (places per slot, blank names — the supervisor fills them)
  and 👤 Auto-assigned (names from the sidur, short shifts first, minutes per break; shown only when the
  reps have names) — each as PDF / Word / Excel (+ text for the assigned one).
- Long + short break = 60 / 40 of the break time in 5-minute steps: 7h → 20 + 15, 8h → 25 + 15,
  10h → 30 + 20; under 6h → one break. Break time = whole working hours × 5 (clean minutes on the sheet).

### ☕ Breaks tab; course reload never doubles; an honest, modular "are your courses enough?"

- New tab "Breaks": a break plan for the day. Every rep on shift (the sidur, else today's team from the
  iron; answering skills) gets a long + a short break (5 min per working hour of their own shift — 7h →
  20 + 15), each in its own slot, 1½ h apart, inside their shift. Each break sits where it costs the
  fewest answered calls (Erlang, the matrix's math), at most 6 per slot (default slots: 20 min, 09:40 →
  15:40; Friday → 12:00), never outside the center's hours (Settings). Short shifts are placed first.
- At a glance: one tile "breaks for every rep" (a square per rep: green = placed, red = no place,
  outlined = catch-up), one tile for the day's answer rate with this plan (bar + target line, ▲ vs the
  same breaks spread evenly). When not everyone fits, option tiles (earlier first break / later last
  break / more per slot) each show their answer rate — one click applies, a clear "↶ Back to …" undoes.
- Seats: a green cup = a break place, hatched = blocked for breaks, an outlined cup = a catch-up place
  (late in the day, and inside a short shift) for whoever missed theirs; an amber edge = the breaks take
  that slot under the need (in the legend only when it happens). Hovers are one short line.
- The sheet lists who goes when (name + minutes) plus the catch-up lines — no sign-up, no queue. Export
  (one button): PDF / print, Word (.doc), Excel (.xlsx, opens cleanly in Excel 2016), copy as text.
  ⚙ (in the toolbar): first / last break, Friday's last, slot length, cap, spare % — 24-hour lists.
- The course planner's undo is the same clear button.
- Fix (root cause): a quote inside a CSV field (ב"ש, סה"כ, חו"ל) opened a quoted field and swallowed
  the row — every course named ב"ש vanished from a course file. A quote opens a field only at its start.
- Course files: the same course again is recognized (name aside from spaces / quote marks / case, or
  the same location + start + length) — re-dropping a plan says "N already loaded — updated, not
  doubled".
- "Are your courses enough?": "yes" only when EVERY month reaches the target (it said "yes" when the
  short months were simply out of reach); each suggested change has its own tick; "↶ Undo" restores
  the courses exactly; "? How it is worked out" in three steps; a month click shows its numbers
  (needed · today − leaving + graduates). The Trajectory line follows the same rule.

### Forecast weeks: today's team vs "include attrition & courses"; trainees answering; uniform toggles

- Root cause: a forecast week without a sidur showed neither the iron nor today's team — it used the
  forecast file's historical staffing, silently scaled by attrition and courses. Now one switch,
  "Include attrition & courses" (off by default), on the matrix and on Date Trends (same state, same
  place — the far end of the toolbar): off = today's team = the iron (Friday by the rotation, the 🎧
  skills; no iron → the file's history); on = the same × projected headcount (− attrition + course
  graduates). Its hover says the week's change in people. Weeks with a sidur always show the sidur.
- 🎓 Trainees answering during their course (the instructor's weekly number): a chip in the matrix week
  bar opens a small box — how many, hours, days, counted as 50% (productivity + who shows up;
  remembered). The matrix and Date Trends count them; the scheduler's suggestions and the What-If
  don't. The cell hover says "incl. 6 trainees (12 × 50%)".
- One on/off look app-wide (gray track off, navy track on — the knob vanished on white buttons); only
  the holiday paint mode stays loud. The target metric (Settings) comes first in the matrix toggle.
- Matrix: no "i" icons — each explanation is the hover of its control. The week pill reads "Next week ·
  ↩ this week" (actual / forecast per day is already in the day headers; the hover repeats it).
- Date Trends: the "hover = … · click = …" line is gone.

### Recruitment & training: course files, editable courses, "are your courses enough?"

- Fix (root cause): a hire rate typed once (or in a merged cell) reached only the first course — the
  rows below were empty and fell to 85%. It now carries down; a file with no rate uses the "hire %
  for new courses" field (remembered), not a hard-coded 85.
- Course files read in any layout: odd HE/EN headers anywhere in the first 20 rows, any column order,
  a title row above, days / weeks / an end date, Excel serials, totals rows ignored, a timeline
  Gantt (dates across the top, marked weeks), courses as columns, or no header at all (by content).
  The same course again (name + start) replaces itself. The drop box shows the file it wants (a mini
  table) + "⬇ Excel template"; a file dropped ANYWHERE on the page is a course plan.
- One place for courses: the table, edited in place (name, trainees, start, days, hire %);
  "+ Course" adds a ready row. The separate 5-field form and the per-course skill list are gone —
  every course is new hires to קו 1.
- "🎯 Are your courses enough?" — rebuilt from `RECRUIT_PLAN_SPEC.md` (the first, one-date version
  could put a whole gap into one course): every month by the forecast's demand, needed vs expected
  reps (attrition, hire rate, a month's ramp-up); short months filled from the earliest course up to
  its location's class size (ב"ש 12 · רחובות 7 · בית 12, editable), then an extra course at the
  earliest free slot of a location. "Trajectory insights" shows the same answer.
- Course length = working days (Sun–Thu); closed holidays — the Hebrew calendar and your own dates —
  push the floor date. Saved courses convert once from calendar days. Location (בית / ב"ש / רחובות)
  is read from the course name, changeable in the table. Files: "weeks" = 5 working days.
- 🎓 Trainees answering: a number per day (a day left empty = none); hours by preset (08–13 /
  12–17 / 08–17) or your own.
- Monthly attrition sits next to the courses too — the same setting as Advanced Settings. Hebrew:
  staff who leave = "עזיבה" everywhere (was "נטישה", the word for abandoned calls).
- Fix (root cause): Date Trends showed a forecast day's answer rate as the historical rate carried
  forward — staffing (courses, a sidur, what-ifs) never moved it, and it disagreed with the matrix.
  Forecast days now use the matrix's rate (verified: courses lift a future day 73% → 93% on both).

### Friday rotation, why-not-scheduled, iron by day, trend charts, own holidays, fast forecast

- Fix (root cause): each rep works **every other Friday**, but the iron lists Friday for everyone
  eligible — so every iron total counted twice the Friday that is really owed (week 27: 58 reps
  with Friday in the iron, 29 on it). One rule now feeds utilization, the impact matrix, readiness,
  the below-iron list and "generate from iron": worked last Friday → off this Friday; didn't → due;
  last Friday unknown → half. `settings.friEvery` (2 / 1) switches it per center.
  Who CAN work Friday comes from the iron only: hours in the Friday cell. Anything else in it
  (חוזה, ללא שישי, empty, any text) = doesn't work Friday — never a validation error (unit-tested).
- Friday memory: one sidur is loaded at a time, so every sidur upload keeps its Friday — names only,
  the last 12 Fridays (~1 KB, `settings.friHist`). Without last Friday the card offers last week's
  file in a small drop box (only its Friday is read; the loaded sidur stays).
- "Friday — last week vs this week": two Fridays in a row · their turn and not in the sidur (with
  the status typed in the sidur) · on as the rotation says · off (worked last week) · worked last
  Friday and no longer active (left / resigned / not in the sidur or iron). Copy any list by team.
  Lives in the Auto-Scheduler (under step ①, the scheduler's week; a week with no shifts yet shows
  "their turn this Friday" — the list to build from) and folded into the Iron validation card.
- "Below their iron — who and why" (was "Internal Roster Optimization"): each rep carries the
  sidur's own reasons (vacation, sick, typed statuses, empty cells, or "no status — shorter
  shifts"); reason chips on top filter the list; the area is no longer capped at 300px; 25 rows.
- "Iron vs sidur — by day" (Workforce, full sidur): per day in people — the iron (light), the sidur
  (navy), the forecast need (tick) — with sidur hours ÷ iron hours under each day; click a day for
  its hours. Folds to one line ("89% of the iron in the sidur"), remembered.
- Date Trends charts: small multiples of the same periods as the table (calls, answer rate, AHT,
  occupancy; + productivity, TSF 30, net hours on demand), one crosshair + tooltip across all,
  click = open the period. "How they relate": calls/net hours/AHT/occupancy vs answer rate over the
  actual periods, fit line and one plain sentence (r and "every +X ≈ Y"). 📊 toggles the strip.
- Holidays table: "your own dates" — name, from–to, level (closed / half / Chol HaMoed / regular);
  they win over the Hebrew calendar and work with the auto calendar off.
- 📈 Fast forecast for sudden demand changes (user story: *as the WFM planner, when a wave of
  claim-status / claim-closure calls hits, I want the next days' forecast to follow within days —
  including the callers who abandoned and will call again — so tomorrow's sidur is not short*).
  Root cause of the slowness: each weekday learns only from its own weekday (a Tuesday surge reaches
  Wednesday a week later), Holt smooths, and the outlier guard clips the very surge days. The fast
  lane reads the last 10 working days against the same daily model fed only earlier history (and a
  billing calendar learned before the window — a surge on billing days was being read as
  "billing"), takes out callbacks (a share of the abandons above the usual rate: ¾ next working
  day, ¼ the day after), and when the shift is clear (≥6%, last 3 days the same side) moves the
  next days to the new level, fading back by half every ~2 weeks. Calm data is untouched.
  Shown only during a real shift: "📈 +18%" in the matrix week pill and one line in Date Trends;
  details + ⚙ fine-tune in Advanced Settings → Forecasting models.
- One skill list app-wide: the Workforce page's own "Skill" filter is gone — its place holds the
  same 🎧 answering-skills list as the matrix, scheduler, recruitment and Settings (one state).
  Every Workforce number follows it, so the utilization KPI and the iron-by-day summary are the
  same number (they were 90.6% vs 89%: one followed the page filter, the other also the 🎧 list).
- 📈 short explanation ("i" by the switch, panel intro): two plain sentences.
- Perf: `wfWeek()` built a new Set per sidur row on every call.

### Empty sidur → readiness → sidur from the iron

- Fix: an empty cell parsed as 00:00 (`normTimeAny("")`, `+"" === 0`), so a sidur with no hours
  yet was rejected as "no valid rows" — iron included. A named rep with a date but no hours is
  now "not scheduled yet", not a bad row.
- Fix: the week list was built from the forecast range only — after a refresh, a sidur week past
  the forecast (or with no forecast) vanished and the week picker went blank. The list now
  always includes the sidur's own week(s), and a loaded sidur opens on its week.
- Fix: an empty sidur's skill list came only from rows with hours (none) → the answering skills
  fell back to "all"; skills now come from every sidur row.
- Empty (or <10% scheduled) sidur upload: the toast and the upload box say "week N · not
  scheduled yet"; the app opens the Workforce page, where one readiness chart replaces the
  utilization KPIs + treemap — an Over/Under chart in people: per day, the answering reps (🎧)
  in the iron vs what the forecast needs; green up = surplus, red down = short, on tinted zones.
  Everyone in the iron counts as fit to work; statuses already typed in the sidur (חופש,
  התפטרות…) are flagged in one alert line, never subtracted. No forecast → reps per day.
  Clicking a day opens it: the same chart by hour (reps at the same time) + that day's statuses.
- The scheduler starts on "generate from iron" for that week (set once at upload; a full sidur
  sets fine-tune). No forecast for the week → the sidur is built from the iron as is.
- Generating from iron places everyone in the iron (only explicit full-day constraints are
  respected), and keeps reps outside the answering skills at their iron windows (they were
  missing from the generated sidur and its export).
- "Generate from iron" mode marks the answering-skill choice: a short label + a quiet ring on the
  🎧 picker (two soft pulses on entering the mode); hover says only those skills are placed
  against demand.
- The generated sidur of an empty sidur's week becomes the sidur (shifts, matrix capacity,
  Workforce rows) — every page reads it as a full one; persists across refresh.
- Absences impact matrix: on an empty sidur, "actual" = iron − known absences (was: every row
  read as a full-day loss, −55%); without a forecast it says a forecast is missing (not "load iron").

### Changed (scheduler polish & scope)

- ③ offers come only from reps in the answering scope (🎧) and never from reps kept "as is" —
  a digital rep no longer shows up to close voice demand.
- Hovering an offer previews it in the gap matrix: the covered cells lift, get a green border
  and show the value they would drop to, before anything is ticked.
- "Shifts moved" KPI counts moves only (= the day switcher sum); ③ extensions are their own
  sub-line ("+n extended in ③") and their own type ("extended") in the TL list.
- KPI units: answer-rate change shows "%", shortage shows "h"; in Hebrew the arrow reads the
  same direction as the label (before ← after).
- Readiness chips (forecast days / shifts / constraints) removed — the gate notes speak only
  when something is missing. ③ context line shortened.
- Auto-Scheduler step ① reads top-down: mode · week · answering scope → optional settings →
  the run button, placed alone after the settings (same look as before).
- "How the sidur was moved": each day button carries its short date (5/7) — the forecast shown
  is the sidur week's own; the day sentence says "this day", the weekly KPI tooltip says it is
  the sum of the days.
- ③ tray totals in rep-hours (was "missing half-hours", which counted a +6 cell as 6) — the
  total now equals the weekly KPI "after" value.

### Added

- Optimizer explainability ("How the sidur was moved", Auto-Scheduler, fine-tune runs): one
  day at a time, drawn the way the algorithm works — shifts SLIDE. Identical moves are one
  lane ("×14", bar labelled with its hours); each bar starts at its old slot (dashed outline),
  slides to the new one and turns navy with its new hours. Above, a colour-only strip
  (short — darker = more / surplus / balanced) switches from before to after as the bars land.
  One sentence carries the numbers; who moved is a collapsed list; ↻ replays.
- Weekly matrix, optimized view: each cell shows ▲n / ▼n reps vs the current sidur, and a
  "↔" in the day header opens the same explanation for that day.

- "What to send to team leaders" (result card): a checklist — one row per team leader; hover
  = the exact message, click = the changes; 📋 per TL or one message for everyone; "n/N sent"
  and "changed since sent". A switch per team (and "don't move" per rep) keeps them as in the
  sidur — the optimizer re-runs without them and every number, picture and offer follows.
- Uncovered demand: a line saying what it builds on (the moves you kept; approvals add on top
  and go into the export). The gap map is live — hover = reps short + how many offers help,
  click = only those offers, ticking an offer closes its cells (✓) before anything is applied.
- Export for the analyst: "📋 Copy for the sidur" (paste-ready, tab-separated) and CSV with only
  the sidur's input columns — entry · exit · day · name by default — one row per shift, each
  rep's rows together in the original sidur's order, days א→ו. ⚙ picks/reorders columns (drag)
  and the header row; remembered. The full export moved into ⚙.

### Fixed (round 5)

- Locking a team/rep made OTHER teams jump: locked reps stopped counting toward demand (they went
  to the rules-only group), so the optimizer compensated elsewhere — and every switch re-ran the
  whole optimizer. Now locked reps still cover demand, a switch changes only what it names, and
  switching back restores exactly the previous moves (no re-run, ~50 ms, no animation replay,
  save deferred). "↻ Re-optimize with your choices" is offered after a lock, never automatic.
- Split shifts (two shifts for one rep on one day): export, extensions, locks and restores now
  match the exact shift (the export used to drop one of them).
- Every dropdown stays inside the window (the export columns menu opened off-screen in RTL).

### Changed (round 5)

- Weekly shortage tile says "weekly", with "≈x% of the hours needed · ~y a day" and a tooltip
  (a morning surplus doesn't cancel an evening shortage).
- Kept reps stay on their line and show what was given up ("kept · instead of 10:00–17:00");
  "don't move" / "allow moving" are pill buttons.
- One reorder control app-wide (`chipOrder`): pill chips on a track, click = in/out, smooth
  pointer drag (first/last included), keyboard arrows. Used by the analyst export and the share
  summary. Export menu grows with its columns; the button reads "⚙ Columns".
- Analyst export: every rep × every day א–ו (Friday included; entry/exit empty when there's no
  shift). A "⤳ skip" chip marks a formula column in the sidur — the copy then runs in steps
  ("📋 Copy 1/2" → paste → "2/2").
- ③ Uncovered demand: offers and the gap map side by side (map pinned while scrolling). A tray
  shows what the selection closes and its service gain, with "➕ Add" and requests by TL. Short
  rows (likelihood dot · name · day · "until 17:00 · +2h" · 📱), details on hover, hover a row
  → its cells light up on the map. Likelihood filter with a one-line explanation. Adding an
  extension changes only that shift (no re-run); "Added to the sidur" lists each with ✕ to undo
  one (a rep changed their mind). The card explains why stretching is separate from sliding.

### Fixed

- "Projected answer-rate change" compared measured history with a pure model and counted every
  skill on the optimized side only — inflated. Both sides now run through the same model with
  the same answering reps; only the sidur differs.
- Result KPIs: "shortage, rep-hours (before → after)" leads; the coverage-rule KPI shows only
  when rules exist (no empty "—"); "hours moved" removed.

### Changed

- Auto-Scheduler page follows the manager's journey: ① prepare & run (constraints and coverage
  rules folded into one "⚙ Before running (optional)" section whose summary shows what's set)
  → ② the result (KPIs → how it moved → coverage → changes per team leader) → ③ what's still
  missing (extension offers + gap map) → the full schedule and pool for reference. ②, ③ and the
  reference tables appear only after a run. Replay is a small round ↻ beside before/after.

## Merged in PR #17

### Fixed

- Productivity read high on ACD exports whose login column is named "שעות נטו" / "net hours":
  it wasn't recognized, so the app estimated hours from the gross schedule × availability.
  Now read as net login hours (Book1 June 2026: app = file on every day, was −21%…+20%).
- Occupancy above 100% in a 0–1 column (1.114 = 111.4%, end-of-day ACD intervals) was read
  as 1.1%. The scale is now decided once per column; a day's measured occupancy is weighted
  by net hours when the file has them (matches the file's own totals).
- Weekly matrix: switching to the optimized preview no longer pushes the toolbar around
  (the preview chip is gone; preview = the toggle + a thin frame around the grid).
- "i" tooltips are never clipped: one floating tooltip, kept inside the window.

### Added

- Weekly matrix: "Optimized ✨" appears on any week that has a sidur — the first click runs
  the fine-tune for that week and previews it in place (the sidur is untouched).
- Home: the queue file's minimum in one line (date · interval · inbound calls · AHT) and a
  row of optional-column chips — hover = what each adds; ✓ for those your file has.
- Date Trends: "Net hours (actual)" column, shown only when the file has net/login hours
  (measured days only — never a projection).
- Share summary: drag the column chips to reorder the summary's columns (remembered).

### Changed

- All "i" tooltips rewritten short and in the user's terms (−55% text, EN + HE), no internals.
- Home: the 4 step cards are gone (the portals are the steps); sidur portal trimmed to one line.
- Matrix: the data-audit chip moved off the matrix (it lives on Home, next to the file);
  the calibration chip is a 💡 recommendation instead of a ⚠ warning.

### Fixed (earlier in this cycle)

- Productivity and occupancy were inflated whenever some intervals carried answered calls but no
  login hours (e.g. evening blocks exported without login): the numerator counted every
  interval's calls, the denominator only the logged-in ones. Both now cover the same intervals
  (example: 9.6 calls/hr · 80% shown as 12.0 · 100% before). Files with login hours on every
  interval are unchanged.
- Dragging the share-summary image (or any element) inside the page no longer triggers the
  drop-a-file ingestion.

### Added

- Date Trends: Days / Weeks / Months toggle. Week and month rows aggregate correctly
  (calls-weighted rates, occupancy and productivity as Σ÷Σ) and show "days on target"
  (e.g. 14/22) plus an actual / forecast / actual+forecast tag; click a period to open its days.
  A breadcrumb ("↩ Months › August 2026", also Backspace / Alt+←) returns to the same grouped
  view and window, flashing the row you came from. The summary row shows days on target too.
- 📤 Share summary (Date Trends): monthly image (copy to clipboard or PNG) or text of how we
  did and where we're heading, with live options — months back/ahead, which columns, insights
  on/off, and a free line for the reader — remembered in settings. Columns come from one
  registry (SHARE_METRICS). Insights: month-over-month, strongest month, forecast risk,
  courses joining (already in the forecast).

### Changed

- Date Trends opens on a window around today (or the end of the data when it is older):
  days 3 weeks back / 3 ahead, weeks 12 back / 8 ahead, months 6 back / 3 ahead.
- Date Trends: the guidance line above the table is hidden behind a quiet "?" next to the title.
- `trendDayStat(ds)` extracted from `renderTrends` (one source for days, periods and the summary;
  day-row numbers verified identical to before).

## Merged in PR #15

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
