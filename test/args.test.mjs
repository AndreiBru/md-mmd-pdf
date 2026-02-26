import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/lib/args.mjs";

test("parseArgs parses all supported options", () => {
  const result = parseArgs([
    "input.md",
    "-o",
    "out.pdf",
    "--config",
    "config.cjs",
    "--mermaid-config",
    "mermaid.json",
    "--puppeteer-config",
    "puppeteer.json",
    "--verbose",
    "--keep-temp",
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.options.inputPath, "input.md");
  assert.equal(result.options.outputPath, "out.pdf");
  assert.equal(result.options.configPath, "config.cjs");
  assert.equal(result.options.mermaidConfigPath, "mermaid.json");
  assert.equal(result.options.puppeteerConfigPath, "puppeteer.json");
  assert.equal(result.options.verbose, true);
  assert.equal(result.options.keepTemp, true);
});

test("parseArgs rejects unknown option", () => {
  const result = parseArgs(["input.md", "--unknown"]);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.match(result.error, /Unknown option/);
});

test("parseArgs rejects missing option values", () => {
  const result = parseArgs(["input.md", "--config"]);
  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.match(result.error, /Missing value/);
});
