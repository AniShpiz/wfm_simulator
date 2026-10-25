# RECRUIT_PLAN_SPEC.md — "Are your courses enough?"

Status: **built** (branch `fix/recruit-courses`, 2026-10-25) from the decisions below. The first version
(one date, proportional split) was dropped: it ignored course constraints and could put a whole gap
into one course.

## The user and the question

Recruitment / WFM manager planning the coming months of courses:

> "Will I have enough reps on shift, every month, to hold the answer-rate target?
> If not — how many should I recruit for each course, and do I need another course?"

## Decisions (product owner, 2026-10-25)

| Topic | Decision |
|---|---|
| Target | **Hold it every month**, by the **forecast's** demand per month (dynamic). |
| Course length | **Working days** (Sun–Thu); closed holidays (Hebrew calendar + your own dates) don't count and push the floor date. Roughly the same everywhere; home courses are longer. |
| Locations | From the course name: **בית**, **ב"ש**, **רחובות** (changeable in the table). A location runs **one course at a time** — the next opens when the previous ends. |
| Class size | Per location — realistic: **ב"ש 12 · רחובות 7 · בית 12**; any other location 20. Editable (⚙ under the plan). |
| Recruiting lead time | **0** — a course can be filled up to the day before it opens. |
| Ramp-up | A new rep reaches full productivity **within a month** of certifying (modelled 50% → 100% over 30 days). |
| Fill order | **The earliest course first.** |
| Not enough | **Suggest an extra course** at the earliest free slot of a location; one click adds it. |
| Wording | No "מצבה" — reps / "נציגים". |

## Model (as built — `hirePlan` in index.html)

Per month in the forecast (from this month, up to 6):

- **Needed reps** `N = today's reps × Σ needed staffing ÷ Σ today's-team staffing` over the month's
  forecast days — "needed staffing" = the matrix's interval need for the target; "today's team" = the
  iron (Friday by the rotation, answering skills), or the forecast file's history without an iron.
- **Expected reps** `E = today's reps − monthly attrition to mid-month + graduates on the floor by
  mid-month`, each graduate × hire rate × early-attrition factor × ramp-up.
- Short month → add trainees to the earliest course that graduates by mid-month, up to its location's
  class size; still short → an extra course at the location whose next slot graduates first
  (length = the location's usual course length, default 12 working days); if none graduates in time,
  the month is reported with the date the earliest extra course can graduate.

## Screen

"🎯 הקורסים מספיקים?" → the answer ("✓ כן — כל חודש עד ינואר" / "+12 חניכים נוספים לגייס · ועוד קורס
אחד") → per month: needed (tick) vs expected (bars — as planned and with the additions), short months
in red → the courses to top up (count → new count, "(מלא)" at the class size) and the suggested courses
→ "✓ לעדכן את הקורסים" → ⚙ class size by location. Without a forecast for the coming months the box
says so in one line. The Recruitment page's "Trajectory insights" line shows the same answer.
