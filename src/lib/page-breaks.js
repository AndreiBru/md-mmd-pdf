const PAGE_BREAK_REPLACEMENT = '<div class="page-break"></div>';
const PAGE_BREAK_CSS = `
.page-break {
  break-after: page;
  page-break-after: always;
}
`.trim();

/**
 * @param {string} markdown
 */
export function normalizePageBreakMarkers(markdown) {
  const lines = markdown.split(/\r?\n/);
  const endsWithNewline = /\r?\n$/.test(markdown);

  let inFence = false;
  let fenceChar = "";
  let fenceLength = 0;

  const processed = lines.map((line) => {
    const fence = parseFence(line);

    if (inFence) {
      if (fence && fence.char === fenceChar && fence.length >= fenceLength) {
        inFence = false;
        fenceChar = "";
        fenceLength = 0;
      }
      return line;
    }

    if (fence) {
      inFence = true;
      fenceChar = fence.char;
      fenceLength = fence.length;
      return line;
    }

    if (isPageBreakMarker(line)) {
      return PAGE_BREAK_REPLACEMENT;
    }

    return line;
  });

  const output = processed.join("\n");
  return endsWithNewline ? `${output}\n` : output;
}

export function getPageBreakCss() {
  return PAGE_BREAK_CSS;
}

/**
 * @param {string} line
 */
function isPageBreakMarker(line) {
  return (
    /^\s*\\newpage\s*$/.test(line) ||
    /^\s*<!--\s*pagebreak\s*-->\s*$/i.test(line)
  );
}

/**
 * @param {string} line
 * @returns {{ char: "`" | "~", length: number } | null}
 */
function parseFence(line) {
  const match = line.match(/^\s*([`~]{3,})/);
  if (!match) {
    return null;
  }

  const token = match[1];
  const char = token[0];
  if (char !== "`" && char !== "~") {
    return null;
  }

  return { char, length: token.length };
}
