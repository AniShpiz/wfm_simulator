# DATA_PRIVACY.md

Data privacy statement for the WFM Simulator.

## Local Processing

This application is designed to process uploaded operational files locally in the browser.
No server backend is required for core functionality.

## Upload Behavior

- Files are read locally from user device.
- Parsing and calculations run in-browser.
- The app does not require cloud upload to function.

## Local Storage

The app stores workspace/data state in browser localStorage to improve continuity across refreshes.

Stored categories may include:

- user settings and preferences
- ingested dataset snapshots
- derived scheduling/forecast structures

## Operator Guidance

If working on shared machines:

- Use workspace reset before leaving session
- Clear browser storage if needed by policy

## Development Rule

Contributors should not add features that transmit customer data externally unless explicitly approved and documented with clear opt-in behavior.
