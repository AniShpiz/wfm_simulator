// Extracts functions/consts verbatim from index.html so tests run the SHIPPED code.
"use strict";
const fs = require("fs");
const path = require("path");
const HTML = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function extract(name, kind = "function") {
  const marker = kind === "function" ? `function ${name}(` : `const ${name}=`;
  const i = HTML.indexOf(marker);
  if (i < 0) throw new Error("not found in index.html: " + name);
  if (kind === "const") {
    let depth = 0, j = HTML.indexOf("=", i) + 1;
    for (; j < HTML.length; j++) {
      const ch = HTML[j];
      if ("{[(".includes(ch)) depth++;
      else if ("}])".includes(ch)) depth--;
      else if (ch === ";" && depth === 0) break;
    }
    return HTML.slice(i, j + 1);
  }
  let depth = 0, started = false, j = i;
  for (; j < HTML.length; j++) {
    if (HTML[j] === "{") { depth++; started = true; }
    else if (HTML[j] === "}") { depth--; if (started && depth === 0) break; }
  }
  return HTML.slice(i, j + 1);
}

/* Builds a sandbox exposing the requested shipped functions.
   ctx supplies stubs for globals the functions reach for (state, t, document…). */
function sandbox(fnNames, constNames = [], ctx = {}) {
  const base = {
    t: (k, o) => k + (o ? JSON.stringify(o) : ""),
    document: { getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, addEventListener() {} }) },
    state: {},
    ...ctx,
  };
  const src = constNames.map(n => extract(n, "const")).join("\n") + "\n"
    + fnNames.map(n => extract(n)).join("\n");
  const names = [...fnNames, ...constNames];
  const body = src + "\nreturn {" + names.join(",") + "};";
  const keys = Object.keys(base);
  return new Function(...keys, body)(...keys.map(k => base[k]));
}

module.exports = { extract, sandbox, HTML };
