// The whole page script must parse (one stray "//" can comment out a brace and kill the app),
// and every UI string must exist in both languages.
"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { HTML } = require("../extract.js");

const SCRIPT = HTML.slice(HTML.indexOf("<script>") + 8, HTML.lastIndexOf("</script>"));

test("the page script parses", () => {
  assert.doesNotThrow(() => new Function(SCRIPT));
});

test("every t(\"key\") and data-i18n key exists in EN and HE", () => {
  const I18N = new Function(SCRIPT.slice(SCRIPT.indexOf("const I18N"), SCRIPT.indexOf("\n}};") + 4) + "\nreturn I18N;")();
  const used = new Set([...SCRIPT.matchAll(/\bt\("([A-Za-z0-9_]+)"/g)].map(m => m[1])
    .concat([...HTML.matchAll(/data-(?:i18n|tipkey|i18n-title|i18n-ph)="([A-Za-z0-9_]+)"/g)].map(m => m[1])));
  const dynamic = k => /_$/.test(k) || k === "cmT" || k === "faH"; // prefixes completed at runtime
  for (const lang of ["en", "he"]) {
    const missing = [...used].filter(k => !dynamic(k) && !(k in I18N[lang]));
    assert.deepStrictEqual(missing, [], lang + " is missing keys");
  }
  assert.deepStrictEqual(Object.keys(I18N.en).filter(k => !(k in I18N.he)), [], "keys only in EN");
});
