# REALTIME_SPEC.md — "Who isn't on the floor right now, and where is today heading?"

Status: **draft** (branch `feat/realtime-cms`, 2026-11-06). Nothing built yet. The decisions marked **open**
wait for the owner and for real export samples.

## The user and the question

The floor manager / WFM analyst during the day, on the client's network:

> "Who should be on now and isn't logged in? Does it hurt the answer rate, and which team manager do I call?"
> "Where will today end, and what's the one thing I can still do about it?"

The plan (sidur, iron, forecast, ☕ breaks) is already in the app. The missing half is **what's actually
happening**, and that lives in Avaya CMS.

## How the data arrives

```
Avaya CMS server
   │  (Supervisor's own login)
CMS Supervisor on one PC on the client network ── Windows Task Scheduler runs saved report scripts (.acsauto)
   │  writes tab-separated text files
\\client-share\WFM\live\            ← one network folder: the only "bridge"
   │  read (File System Access), never sent anywhere
every viewer's browser on that network, running the GitHub Pages app
```

- **No server, no install on the viewers' PCs, nothing leaves the network.** The page only reads files; the
  CSP `connect-src 'none'` still holds. The folder is on the client's share, never in the repo.
- **The export (one PC).** In Supervisor: open the report → save it as a script that *exports data* to a file in
  the folder (tab-separated, with headers) → Task Scheduler runs the script on a period. The script logs in
  with the user set in Supervisor's scripting options. Steps differ by Supervisor version; verify them on the
  machine.

| File | CMS report | Period | Gives |
|---|---|---|---|
| `rt_agents.txt` | Real-time agent report (all 🎧 skills) | every 2–3 min | login ID, display name, state, AUX reason, time in state |
| `rt_interval.txt` | Historical split/skill **interval** report, today | every 30 min, at :05 / :35 | per half hour: offered, answered, abandoned, AHT, avg positions staffed |
| `rt_map.csv` | — (the app + the owner) | on change | login ID ↔ sidur name (see matching) |

- **Reading.** The folder is picked once per PC (see "Zero clicks"). The app polls every 30 s: a file whose `lastModified` changed is re-parsed. A file caught
  mid-write (parse fails, or far fewer rows than the last good read with the same header) is skipped; the last
  good read stays until the next tick. Without the File System Access API (blocked by policy): drop the file, one
  shot. **Open:** check the export's encoding (likely Windows-1255 for Hebrew AUX names).
- **The data's time** = the file's `lastModified`. Fresh = nothing to say (a small "● 10:42" next to the sidur
  chip). Older than 3× its period = the live marks turn gray, "as of 10:12". The user can act on that: the
  export PC is asleep or the task stopped.

### Zero clicks (owner's rule: nobody clicks "check live")

Live is not a mode or a button. Once a viewer's browser knows the folder, opening the link shows today's data,
live.

- **Once per viewer PC (~20 s, the owner does it):** open the link → Settings › live folder → pick
  `\\client-share\WFM\live` → answer the browser's question with **"Allow on every visit"**. From then on, every
  open reads the folder with no prompt: the folder handle is kept in IndexedDB, and Edge keeps the permission.
  **Verify** on the client's Edge that policy doesn't turn persistent permission off.
- **If the browser asks again** (policy, cleared site data), no button appears. The browser only asks after a
  click, so the app asks for the permission on the user's first natural click anywhere on the page. One
  answer, and it's live.
- **The folder holds the plan too (recommended, decision 7 → yes):** the newest sidur and forecast in it load
  by themselves. A viewer never uploads anything.
- **Fresh whenever someone looks:** the app polls every 30 s and reads at once when the user comes back to the
  tab (`visibilitychange`). A background tab is throttled to about 1 min, and Edge's sleeping tabs stop it.
- **Updates without disturbing:** a new read redraws only the live marks. The user's scroll, open panel, hover
  and edits stay as they are. Today's week and the current half hour follow the clock, unless the user picked
  another week.
- **The value appears where people already look:**
  - the matrix's current half hour carries "−3" (its hover = who);
  - the tab title reads "(3) WFM" while reps are missing, so it shows from any other tab, and goes plain when all
    are there;
  - the 👥 panel opens already ticked, with the 📋 messages ready;
  - phase 2: today's re-forecast in the matrix's today row.
- **No desktop notifications in phase 1:** they need a permission click and break the silence rule (**open**).

### Running the export on the owner's PC

- Each run takes a few seconds: Supervisor's script engine starts, logs in, opens the report, writes the file and
  closes. CPU and network use are light, and work goes on as usual.
- **Test once:** does a window flash or steal focus? Does an open Supervisor session stay logged in while the
  script runs (CMS counts Supervisor logins)? If a window flashes, set the task to run minimized/hidden.
- **The PC must be awake.** A locked screen is fine (the task runs while the user is logged on); sleep, shutdown
  or a day off stops the feed for everyone. The live marks go gray, so nobody is misled. Long term: move the
  task to an always-on PC on the client network.

## Matching CMS agents to sidur reps

CMS knows a rep by **login ID** (stable) and an English **display name**. The sidur knows them by a Hebrew name.

Evidence, strongest first:

1. **`rt_map.csv`**: columns `login, cms_name, sidur_name, source (table|confirmed|auto), date`. Seeded once
   from the owner's agents table; afterwards the app adds what it learns. The file sits in the shared folder, so
   every viewer uses **one** map and a match confirmed once is confirmed for all. The owner can edit it in Excel.
   A table row always wins.
2. **Auto-match**, for IDs not in the map: a name score **and** a schedule-parity score.

**Name score (transliteration).** Both names → a consonant skeleton in shared sound classes, then a
weighted edit distance:

- Hebrew: א ע ה ו י act as vowels (dropped or optional); ב→B/V, כ ך→K/X, ח→X, פ ף→P/F, צ ץ→TS, ש→S/SH,
  ת ט→T, ק→K. English: vowels dropped; ph→F, ch/kh→X, sh→SH, tz/ts/z→TS, ck/c/q→K, th→T, w→V.
- Near sounds cost little (B~V, K~X~H, P~F, S~SH, T~TH); a dropped vowel letter costs nothing.
- Per token, order-free: "Cohen Dana" = "Dana Cohen" = "דנה כהן" (D-N · K-H-N). CMS names are often
  UPPERCASE and cut at a fixed length, so a token that is a prefix still matches.
- Nicknames (Avi ↔ אברהם) can't be guessed. The map solves them once.

**Parity check (the schedule agrees).** A login ID that is logged in exactly when a sidur rep is scheduled is
probably that rep. Score = overlap of the ID's logged-in half hours with the rep's scheduled half hours
(Jaccard), accumulated over the day's snapshots and over days. Then a **one-to-one** assignment: each ID ↔ at
most one rep. A match needs a clear margin over the second-best candidate.
**Optional calibration:** CMS's historical *Agent Login/Logout* report for last week + last week's sidur =
a whole week of parity at once, so most matches are sure on day one.

**Tiers.**

| Tier | Rule (thresholds tuned on real names, **open**) | Effect |
|---|---|---|
| Sure | name ≥ 0.85 and parity doesn't contradict, or parity strong and name ≥ 0.6, with margin | used and written to the map (`auto`), silent |
| Likely | below sure, best candidate with margin | used; listed once in "check matches" (✓ / ✗, one click each) |
| None | — | the ID stays unmatched |

**The safety rule (no false alarm).** A rep is called *not logged in* only when no logged-in ID could be them.
While an unmatched logged-in ID could be that rep, the rep shows "maybe: COHEN D · 4417" instead of "missing".
Aggregate parity check: the count of logged-in IDs in the 🎧 skills should equal matched + unmatched. Each
half hour's *avg positions staffed* (interval file) should agree with the snapshots. When they don't, the
reading is wrong, and the app says so in plain words instead of drawing conclusions.

## Agent states → what the app reads (decide once, **open**)

| CMS | App |
|---|---|
| AVAIL, ACD, ACW, RING, DACD, DACW, OTHER | on the floor |
| AUX + reason (names from the CMS dictionary) | the owner maps each reason once to: ☕ break · off the phone (meeting, training…) · other |
| not in the report | not logged in |

A ☕ break that the plan (`breakPlan`) expects at that time is not "missing". An AUX break outside the plan
is off plan.

## What it gives (features), in phases

**Phase 1: 👥 the floor right now** (reuses `whoOn` / `openWho` / `tlMsg`, no new page)

- The current half hour of today in the matrix carries a live mark. Its 👥 panel ticks itself: **not logged
  in** ("shift began 08:00 · 12 min"), **left early**, **long AUX off plan** (over X min, **open**). Logged in
  but not in the sidur = extra (shown, not alarming). The half hour's rate without them = the existing
  `evalInterval` delta. 📋 one `tlMsg` per team manager.
- Silent when everyone scheduled is there.

**Phase 2: today on the matrix**

- Each half hour that has ended shows what happened: calls, AHT, staffed, AR / TSF, against the forecast
  that was there (design **open**: the actual value in the cell, the forecast as its hover / tick).
- **The rest of today, re-forecast:** the remaining half hours are scaled by actual ÷ forecast so far. The
  ratio is shrunk toward 1 while few calls are in (k = calls so far ÷ (calls so far + C)), the same idea as the
  📈 fast lane, inside the day. Capacity = the sidur minus who is known missing. The result: "today ends near
  x%" + where the gap is + the one action left (extend whom / move which break), from the existing engines.

**Phase 3: the floor teaches the plan** (history, small)

- Per rep per day, store only a summary: planned minutes, logged-in minutes, late minutes, AUX minutes by
  class. Raw snapshots are not stored. Retention: **open**.
- Attendance and lateness by team and weekday. Measured login hours replace the estimate in `prodBacktest`
  (ρ). Measured shrinkage by AUX class becomes the suggestion for Settings' shrinkage / absence.

Later: a wall-board view for the floor; the matrix's "who should be on" for every viewer from the same folder.

## Design bar (DESGIN.md) applied

- **Silence:** no folder, no change to any page. Fresh and healthy = one small dot. A *missing* claim only from a
  confident match.
- **Time zones:** every live number carries its time ("10:42"); stale reads gray with "as of".
- **One concept, one control:** the 👥 panel and `tlMsg`, not a second "live" screen; one map file for everyone.
- **Root cause:** a weak match never becomes an alarm; a mismatch between the files says the reading is wrong.

## Open decisions (owner)

1. Late threshold (5 min?) and long-AUX threshold.
2. Export periods (agents 2 or 3 min).
3. The exact reports: send one export of each, headers included.
4. AUX reason → class mapping.
5. Who may write `rt_map.csv`: any viewer, or the owner only.
6. Phase 3 retention.
7. Does the same folder hold the sidur and forecast too (the feed folder)? Recommended: yes, for zero clicks.
8. Desktop notifications for a big event (e.g. 5+ missing), or the tab title only?

## Risks

- Supervisor menus and script options differ by version; the export steps must be verified on the machine.
- The client's Edge policy may block the folder picker; the fallback is a manual drop.
- One export PC is a single point of failure (gray "as of" makes it visible, not silent).
- A file read mid-write: guarded by "keep the last good read".

## Tests (when built)

- Unit: transliteration + name score on synthetic HE/EN pairs (order swap, prefix cut, near sounds); parity +
  one-to-one assignment; the safety rule; the CMS export parser (fixtures from the owner's samples, with fake
  names).
- Browser: the reader behind one small interface, so a test feeds files without the folder picker.
