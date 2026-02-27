# md-mmd-pdf — Codebase Walkthrough

## High-Level Overview

`md-mmd-pdf` is a focused CLI tool that solves one specific problem: **converting a Markdown file that contains Mermaid diagrams into a PDF**. It glues two existing tools together in a pipeline:

1. **Mermaid CLI** (`mmdc`) — renders Mermaid code fences into SVG images
2. **md-to-pdf** — converts the resulting Markdown (now with SVG references instead of Mermaid code) into a PDF

The project is a pure ES module Node.js package (v0.1.1), requires Node >= 18, has zero dev dependencies, and only two runtime dependencies.

---

## Architecture: The Pipeline

The core design is a **sequential pipeline** with cleanup:

```
Input .md file (with Mermaid fences)
        │
        ▼
  ┌─────────────────────┐
  │ 1. Validate input   │  ensureInputExists()
  └──────────┬──────────┘
             ▼
  ┌─────────────────────┐
  │ 2. Mermaid render   │  mmdc -i input.md -o temp.md -a artefacts/ -e svg
  │    (subprocess)     │  Replaces ```mermaid fences with <img> SVG refs
  └──────────┬──────────┘
             ▼
  ┌─────────────────────┐
  │ 3. Page breaks      │  \newpage / <!-- pagebreak --> → <div class="page-break">
  └──────────┬──────────┘
             ▼
  ┌─────────────────────┐
  │ 4. PDF generation   │  md-to-pdf with merged CSS + user config
  └──────────┬──────────┘
             ▼
       Output .pdf file
        + cleanup temp files
```

---

## Key Components

### 1. `src/cli.js` — Entry Point

The executable (`#!/usr/bin/env node`). It's the thinnest possible shell:

- Parses CLI args via `parseArgs`
- Handles `--help` and `--version` early exits
- Delegates to `convertMarkdownToPdf()` for all real work
- Formats errors via `formatError()` and sets exit codes
- Reads the version dynamically from `package.json` (no hardcoded version string)

### 2. `src/lib/args.js` — Argument Parser

Hand-rolled argument parser (no dependency like `yargs` or `commander`). Key design choices:

- Returns a **discriminated union**: `{ ok: true, options }` or `{ ok: false, error }` — forces the caller to handle both paths
- Rejects unknown flags immediately (`--unknown` → error)
- Validates that valued flags (`--config`, `--output`, etc.) have a following argument that doesn't start with `-`
- Limits to exactly one positional argument (the input file)

### 3. `src/lib/pipeline.js` — The Core Pipeline

This is the heart of the application.

#### Setup

`convertMarkdownToPdf` resolves paths, generates a unique token (`timestamp-PID-randomHex`), and derives temp file paths:

- `token` ensures temp files never collide, even with concurrent runs
- Temp files are dot-prefixed (hidden) and placed in the same directory as the input file — this is important because Mermaid CLI generates relative SVG paths, and md-to-pdf needs `basedir` to resolve those same relative paths

#### Pipeline execution

The `try/catch/finally` pattern is deliberate:

- **On failure**: deletes any partial PDF output so you never get a corrupt file, then re-throws
- **Always** (finally): cleans up temp files unless `--keep-temp` is set
- This means even if PDF generation crashes, temp files are still cleaned up

#### `renderMermaidMarkdown`

Spawns the Mermaid CLI as a subprocess via `node <mmdc-path>`. Key flags:

- `-i` input, `-o` output (the transformed markdown)
- `-a` artefacts directory (where SVGs go)
- `-e svg` (output format for diagrams)
- Optional `-c` (mermaid config) and `-p` (puppeteer config)

#### `getMmdcPath`

Resolves the Mermaid CLI entrypoint from within the package's own `node_modules`. This avoids relying on the system PATH and ensures the bundled dependency is used.

#### `renderPdf`

Dynamically imports `md-to-pdf`, loads any user config, merges page-break CSS with user CSS, and forces `basedir` and `dest` to deterministic values. The `basedir` override ensures relative asset paths (like `![](sample.svg)`) resolve correctly.

### 4. `src/lib/command-runner.js` — Subprocess Execution

A generic command runner that:

- Uses `spawn` (not `exec`) for proper stream handling
- Captures stdout and stderr into strings
- Streams output in real-time when `--verbose` is set
- Wraps failures in `AppError` with the stage, command label, exit code, and stderr
- Includes a `quoteArg` utility for safe command logging

### 5. `src/lib/errors.js` — Error Handling

`AppError` carries structured metadata: a **stage** label (like `validate-input`, `mermaid-render`, `pdf-render`, `load-config`), an optional command string, exit code, and stderr.

`formatError` renders this into a human-readable multi-line message, truncating stderr to 400 chars to keep output manageable.

### 6. `src/lib/page-breaks.js` — Page Break Normalization

This is carefully implemented:

- Replaces `\newpage` and `<!-- pagebreak -->` with `<div class="page-break"></div>`
- **Tracks code fence state** (both backticks and tildes, with proper nesting length) so markers inside code blocks are left untouched
- Preserves the original trailing newline behavior
- `getPageBreakCss()` returns CSS with both modern (`break-after: page`) and legacy (`page-break-after: always`) rules

### 7. `src/lib/config-loader.js` — Config Loading

Supports four config file formats: `.js`, `.cjs`, `.mjs`, `.json`. For JS modules, it handles both `export default {}` and bare `module.exports = {}` patterns. Always returns a plain object (validated with `isPlainObject`).

---

## Testing Strategy

### Unit Tests

- **`test/args.test.js`** — Tests the argument parser: valid full option set, unknown flags, missing values
- **`test/page-breaks.test.js`** — Tests marker normalization: canonical + comment markers, preservation inside fences, CSS content

### Integration Tests (`test/cli.integration.test.js`)

True end-to-end tests that:

1. Copy test fixtures to a temp directory (isolated, no side effects)
2. Spawn the actual CLI as a subprocess
3. Assert on exit codes, file existence, and file contents

Test cases:

| Test | What it verifies |
|------|------------------|
| Happy path | Valid Mermaid → PDF exists, temp files cleaned |
| No Mermaid | Plain markdown still produces a PDF |
| Invalid Mermaid | Non-zero exit, error mentions `mermaid-render`, no PDF written |
| Custom output + relative assets | `-o` flag works, `basedir` resolves assets |
| `--keep-temp` | Temp files preserved after run |
| Page break markers | Markers outside fences replaced, markers inside fences preserved |

### Test Fixtures (`test/fixtures/`)

Six fixture files covering the key edge cases: valid diagrams, invalid diagrams, no diagrams, relative image assets, and page break markers.

---

## Build & CI

- **`scripts/lint.js`**: Recursively collects all `.js` files in `src/`, `test/`, `scripts/` and runs `node --check` on them (syntax validation, no runtime linter)
- **`scripts/pack-check.js`**: Runs `npm pack --dry-run` with an isolated cache to verify the package tarball contents
- **`npm run check`**: lint + test
- **`prepublishOnly`**: runs `check` + `pack:check` before any `npm publish`
- **GitHub Actions CI** (`.github/workflows/ci.yml`): checkout → Node 22 → `npm ci` → `npm run check` → `npm pack --dry-run`

---

## Design Principles

1. **Zero dev dependencies** — lint is `node --check`, tests use `node:test`, no bundler
2. **Fail-fast with context** — every stage wraps errors with `AppError` carrying stage name, command, and stderr
3. **No partial output** — if any stage fails, the output PDF is deleted
4. **Deterministic paths** — `basedir` and `dest` are always overridden regardless of user config
5. **Idempotent temp files** — unique token prevents collisions; cleanup in `finally` prevents leaks
6. **Discriminated unions over exceptions** — the arg parser returns `{ ok, error }` instead of throwing
