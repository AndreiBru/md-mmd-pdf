# md-mmd-pdf

`md-mmd-pdf` is a CLI that converts a Markdown file containing Mermaid diagrams into a PDF.

It uses Mermaid CLI in markdown mode to replace Mermaid fences with SVG artefacts, then uses `md-to-pdf` to render the final PDF.

## Install

```bash
npm install -g md-mmd-pdf
```

Or run it without global install:

```bash
npx md-mmd-pdf input.md
```

## Usage

```bash
md-mmd-pdf <input.md> [options]
```

### Options

- `-o, --output <file.pdf>`: output PDF path (default: `<input-basename>.pdf` in the input directory)
- `--config <file>`: md-to-pdf config file (`.js`, `.cjs`, `.mjs`, `.json`)
- `--mermaid-config <file>`: Mermaid config JSON for `mmdc -c`
- `--puppeteer-config <file>`: Mermaid puppeteer config JSON for `mmdc -p`
- `--verbose`: print command and subprocess output
- `--keep-temp`: keep transformed markdown and Mermaid artefacts
- `-h, --help`: show help
- `-v, --version`: show version

## Examples

Convert a file using default output path:

```bash
md-mmd-pdf docs/architecture.md
```

Write output to a custom location:

```bash
md-mmd-pdf docs/architecture.md --output output/architecture.pdf
```

Use an md-to-pdf config file:

```bash
md-mmd-pdf docs/architecture.md --config md-to-pdf.config.js
```

Keep intermediate files for debugging:

```bash
md-mmd-pdf docs/architecture.md --keep-temp --verbose
```

## Behavior

- Single-file input and output only.
- Fails fast on Mermaid rendering errors.
- Returns non-zero exit code on any failure.
- Removes intermediate files/directories by default.
- Supports formal page-break markers:
  - Canonical: `\newpage`
  - Alias: `<!-- pagebreak -->`
- Page-break CSS is injected automatically (`break-after: page` + fallback).

## Page Breaks

Use a standalone marker line:

```md
\newpage
```

or:

```md
<!-- pagebreak -->
```

Both are normalized to `<div class="page-break"></div>` before PDF generation.

## md-to-pdf Config

`--config` loads an object and passes it into the `md-to-pdf` programmatic API.

`basedir` and `dest` are always set by `md-mmd-pdf`:

- `basedir` = input markdown directory
- `dest` = resolved output PDF path

This guarantees stable relative asset resolution and deterministic output destination.

## Troubleshooting

### Mermaid render failure

If Mermaid parsing fails, rerun with `--verbose` to see the underlying `mmdc` error.

### Browser launch issues (CI/Linux)

Mermaid CLI and md-to-pdf use Puppeteer. In constrained environments you may need Puppeteer launch settings in your Mermaid or md-to-pdf config files.

## Contributing

Maintainer/development/release notes live in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

MIT
