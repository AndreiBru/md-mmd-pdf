import { mkdir } from "fs/promises";
import { resolve } from "path";
import { spawnSync } from "child_process";

const cacheDir = resolve(".npm-cache");
await mkdir(cacheDir, { recursive: true });

const npmExecPath = process.env.npm_execpath;
if (!npmExecPath) {
  console.error("npm_execpath is not available in environment");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [npmExecPath, "pack", "--dry-run", "--cache", cacheDir],
  {
    stdio: "inherit",
    env: process.env,
  },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
