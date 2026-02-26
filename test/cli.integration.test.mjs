import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, cp, readdir, access } from "fs/promises";
import { constants as fsConstants } from "fs";
import { tmpdir } from "os";
import { join, resolve, parse } from "path";
import { spawnSync } from "child_process";

const CLI_PATH = resolve("src/cli.mjs");
const FIXTURES_DIR = resolve("test/fixtures");

async function setupFixtureDir() {
  const dir = await mkdtemp(join(tmpdir(), "md-mmd-pdf-test-"));
  await cp(FIXTURES_DIR, dir, { recursive: true });
  return dir;
}

function runCli(cwd, args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: "utf8",
  });
}

async function fileExists(path) {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function listTempEntries(cwd, inputFile) {
  const stem = parse(inputFile).name;
  const entries = await readdir(cwd);
  return entries.filter((entry) => entry.startsWith(`.${stem}.md-mmd-pdf.`));
}

test("happy path: markdown with Mermaid generates PDF and cleans temp files", async () => {
  const cwd = await setupFixtureDir();
  const output = join(cwd, "valid-mermaid.pdf");

  const result = runCli(cwd, ["valid-mermaid.md"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await fileExists(output), true);

  const leftovers = await listTempEntries(cwd, "valid-mermaid.md");
  assert.equal(leftovers.length, 0);
});

test("no Mermaid input still generates PDF", async () => {
  const cwd = await setupFixtureDir();
  const output = join(cwd, "no-mermaid.pdf");

  const result = runCli(cwd, ["no-mermaid.md"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await fileExists(output), true);
});

test("invalid Mermaid fails with non-zero and does not write final PDF", async () => {
  const cwd = await setupFixtureDir();
  const output = join(cwd, "invalid-mermaid.pdf");

  const result = runCli(cwd, ["invalid-mermaid.md"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /mermaid-render/);
  assert.equal(await fileExists(output), false);
});

test("explicit output path and relative assets are supported", async () => {
  const cwd = await setupFixtureDir();
  const output = join(cwd, "custom-output.pdf");

  const result = runCli(cwd, ["relative-asset.md", "--output", output]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(await fileExists(output), true);
});

test("--keep-temp preserves transformed markdown and artefacts", async () => {
  const cwd = await setupFixtureDir();

  const result = runCli(cwd, ["valid-mermaid.md", "--keep-temp"]);
  assert.equal(result.status, 0, result.stderr);

  const leftovers = await listTempEntries(cwd, "valid-mermaid.md");
  assert.ok(leftovers.length >= 2);
});
