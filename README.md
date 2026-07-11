# wfm_simulator

## HTML workflow

This repository includes a GitHub Actions workflow at:

- `.github/workflows/take-html.yml`

It accepts your HTML file path as input and uploads that file as a workflow artifact.

### How to use

1. Open **Actions** in GitHub.
2. Select **Take HTML File**.
3. Click **Run workflow**.
4. Set `html_path` (example: `index.html`).
5. Run it and download the `html-file` artifact from the run summary.
