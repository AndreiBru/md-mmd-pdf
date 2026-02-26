import test from "node:test";
import assert from "node:assert/strict";
import { getPageBreakCss, normalizePageBreakMarkers } from "../src/lib/page-breaks.js";

test("normalizePageBreakMarkers replaces canonical and comment markers", () => {
  const input = "A\n\n\\newpage\n\nB\n\n<!-- pagebreak -->\n\nC\n";
  const output = normalizePageBreakMarkers(input);

  assert.match(output, /<div class="page-break"><\/div>/);
  assert.equal((output.match(/<div class="page-break"><\/div>/g) ?? []).length, 2);
  assert.doesNotMatch(output, /^\s*\\newpage\s*$/m);
  assert.doesNotMatch(output, /^\s*<!--\s*pagebreak\s*-->\s*$/im);
});

test("normalizePageBreakMarkers does not replace markers inside fences", () => {
  const input = "```md\n\\newpage\n<!-- pagebreak -->\n```\n";
  const output = normalizePageBreakMarkers(input);

  assert.match(output, /^```md\n\\newpage\n<!-- pagebreak -->\n```\n\n?$/);
});

test("getPageBreakCss includes print-safe page break rules", () => {
  const css = getPageBreakCss();
  assert.match(css, /break-after:\s*page/);
  assert.match(css, /page-break-after:\s*always/);
});
