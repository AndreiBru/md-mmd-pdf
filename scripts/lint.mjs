import { readdir } from "fs/promises";
import { join, resolve } from "path";
import { spawnSync } from "child_process";

const roots = ["src", "test", "scripts"];
const files = [];

for (const root of roots) {
  await collectMjsFiles(resolve(root), files);
}

const check = spawnSync(process.execPath, ["--check", ...files], {
  stdio: "inherit",
});

if (check.status !== 0) {
  process.exit(check.status ?? 1);
}

async function collectMjsFiles(dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectMjsFiles(fullPath, out);
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".mjs")) {
      out.push(fullPath);
    }
  }
}
