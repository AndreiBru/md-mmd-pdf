const HELP_TEXT = `md-mmd-pdf - Convert Markdown with Mermaid diagrams to PDF

Usage:
  md-mmd-pdf <input.md> [options]

Options:
  -o, --output <file.pdf>         Output PDF path (default: input basename + .pdf)
  --config <file>                 md-to-pdf config file (.js/.cjs/.mjs/.json)
  --mermaid-config <file>         Mermaid config JSON file for mmdc
  --puppeteer-config <file>       Puppeteer config JSON file for mmdc
  --verbose                       Print command and subprocess output
  --keep-temp                     Keep transformed markdown and Mermaid artefacts
  -h, --help                      Show help
  -v, --version                   Show package version
`;

/**
 * @typedef {object} CliOptions
 * @property {string} inputPath
 * @property {string | undefined} outputPath
 * @property {string | undefined} configPath
 * @property {string | undefined} mermaidConfigPath
 * @property {string | undefined} puppeteerConfigPath
 * @property {boolean} verbose
 * @property {boolean} keepTemp
 * @property {boolean} help
 * @property {boolean} version
 */

/**
 * @param {string[]} argv
 * @returns {{ ok: true, options: CliOptions } | { ok: false, error: string }}
 */
export function parseArgs(argv) {
  /** @type {CliOptions} */
  const options = {
    inputPath: "",
    outputPath: undefined,
    configPath: undefined,
    mermaidConfigPath: undefined,
    puppeteerConfigPath: undefined,
    verbose: false,
    keepTemp: false,
    help: false,
    version: false,
  };

  const positionals = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "-v" || arg === "--version") {
      options.version = true;
      continue;
    }

    if (arg === "--verbose") {
      options.verbose = true;
      continue;
    }

    if (arg === "--keep-temp") {
      options.keepTemp = true;
      continue;
    }

    if (arg === "-o" || arg === "--output") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        return { ok: false, error: `Missing value for ${arg}` };
      }

      options.outputPath = value;
      i += 1;
      continue;
    }

    if (arg === "--config") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        return { ok: false, error: "Missing value for --config" };
      }

      options.configPath = value;
      i += 1;
      continue;
    }

    if (arg === "--mermaid-config") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        return { ok: false, error: "Missing value for --mermaid-config" };
      }

      options.mermaidConfigPath = value;
      i += 1;
      continue;
    }

    if (arg === "--puppeteer-config") {
      const value = argv[i + 1];
      if (!value || value.startsWith("-")) {
        return { ok: false, error: "Missing value for --puppeteer-config" };
      }

      options.puppeteerConfigPath = value;
      i += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      return { ok: false, error: `Unknown option: ${arg}` };
    }

    positionals.push(arg);
  }

  if (positionals.length > 1) {
    return { ok: false, error: "Only one input markdown file is supported" };
  }

  if (positionals.length === 1) {
    options.inputPath = positionals[0];
  }

  return { ok: true, options };
}

export function getHelpText() {
  return HELP_TEXT;
}
