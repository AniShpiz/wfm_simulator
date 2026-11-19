# DATA_PRIVACY.md

Data privacy statement for the WFM Simulator.

## Local Processing

This application is designed to process uploaded operational files locally in the browser.
No server backend is required for core functionality.

## Upload Behavior

- Files are read locally from user device.
- Parsing and calculations run in-browser.
- The app does not require cloud upload to function.

- Files are only READ, once, into memory (`FileReader`); the app never writes, renames or locks them and creates no
  `~$` owner file. Checked in Edge: with the page still open, the loaded sidur opens for exclusive writing and renames.
  "Locked for editing by <you>" in Excel comes from Excel itself (another open window, a leftover `EXCEL.EXE`, a stale
  `~$` file) or OneDrive syncing — not from the app.

- 📁 Folders (optional): for each kind of file (history, committed hours, sidur, constraints, courses) the user may pick
  the folder it is saved in; the app only READS the newest file of that kind there (read-only access is requested — the
  app cannot write there). The folder handles are stored in the browser's IndexedDB on that computer; "✕" forgets them.
  Nothing read from a folder is sent anywhere.

- 💾 The team's settings file (`wfm-config.js`) holds settings and courses only — no forecast, no sidur, no rep names
  from the files (the Friday memory and the iron history inside the settings are rep names, as in the browser's own
  save). It is written only when the user presses "Save these settings for the team", to the place they choose.

## Local Storage

The app stores workspace/data state in browser localStorage to improve continuity across refreshes.

Stored categories may include:

- user settings and preferences
- ingested dataset snapshots
- derived scheduling/forecast structures
- the Friday memory: who worked each of the last 12 Fridays (rep names only, no hours or IDs),
  kept with the workspace settings so next week's sidur can be compared; cleared by workspace reset

## Operator Guidance

If working on shared machines:

- Use workspace reset before leaving session
- Clear browser storage if needed by policy

## Development Rule

Contributors should not add features that transmit customer data externally unless explicitly approved and documented with clear opt-in behavior.
