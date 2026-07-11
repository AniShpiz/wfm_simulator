const htmlFileInput = document.getElementById("htmlFile");
const cssFileInput = document.getElementById("cssFile");
const jsFileInput = document.getElementById("jsFile");
const runButton = document.getElementById("runButton");
const statusElement = document.getElementById("status");
const preview = document.getElementById("preview");

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#b42318" : "#10693f";
}

function readFileText(file) {
  if (!file) {
    return Promise.resolve("");
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result || "");
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsText(file);
  });
}

async function runWfmApp() {
  const htmlFile = htmlFileInput.files?.[0];
  if (!htmlFile) {
    setStatus("Please select an HTML file first.", true);
    return;
  }

  setStatus("Loading files...");

  try {
    const [html, css, js] = await Promise.all([
      readFileText(htmlFile),
      readFileText(cssFileInput.files?.[0]),
      readFileText(jsFileInput.files?.[0]),
    ]);

    const srcdoc = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>${css}</style>
  </head>
  <body>
${html}
    <script>
${js}
    <\/script>
  </body>
</html>`;

    preview.srcdoc = srcdoc;
    setStatus("WFM app is running in preview.");
  } catch (error) {
    setStatus(error.message, true);
  }
}

runButton.addEventListener("click", runWfmApp);
