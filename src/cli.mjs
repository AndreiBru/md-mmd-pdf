#!/usr/bin/env node

import { readFile } from "fs/promises";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { parseArgs, getHelpText } from "./lib/args.mjs";
import { formatError } from "./lib/errors.mjs";
import { convertMarkdownToPdf } from "./lib/pipeline.mjs";

async function main() {
  const parsed = parseArgs(process.argv.slice(2));

  if (!parsed.ok) {
    process.stderr.write(`${parsed.error}\n\n${getHelpText()}`);
    process.exitCode = 1;
    return;
  }

  const options = parsed.options;

  if (options.help) {
    process.stdout.write(getHelpText());
    return;
  }

  if (options.version) {
    process.stdout.write(`${await getVersion()}\n`);
    return;
  }

  if (!options.inputPath) {
    process.stderr.write(`Missing input markdown file path\n\n${getHelpText()}`);
    process.exitCode = 1;
    return;
  }

  try {
    const result = await convertMarkdownToPdf(options);
    process.stdout.write(`Created PDF: ${result.outputPath}\n`);

    if (result.keptTemp) {
      process.stdout.write(
        `Kept temp files:\n- ${result.transformedMarkdownPath}\n- ${result.diagramsPath}\n`,
      );
    }
  } catch (error) {
    process.stderr.write(`${formatError(error)}\n`);
    process.exitCode = 1;
  }
}

async function getVersion() {
  const packageJsonPath = resolve(
    fileURLToPath(new URL("../package.json", import.meta.url)),
  );
  const packageJsonRaw = await readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(packageJsonRaw);
  return packageJson.version ?? "0.0.0";
}

await main();
