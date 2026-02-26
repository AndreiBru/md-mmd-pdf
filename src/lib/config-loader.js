import { readFile } from "fs/promises";
import { extname, resolve } from "path";
import { pathToFileURL } from "url";
import { AppError } from "./errors.js";

/**
 * @param {string | undefined} configPath
 * @returns {Promise<Record<string, unknown>>}
 */
export async function loadMdToPdfConfig(configPath) {
  if (!configPath) {
    return {};
  }

  const absolutePath = resolve(configPath);
  const extension = extname(absolutePath).toLowerCase();

  try {
    if (extension === ".json") {
      const json = await readFile(absolutePath, "utf8");
      const parsed = JSON.parse(json);
      if (!isPlainObject(parsed)) {
        throw new Error("Config JSON must contain an object");
      }

      return parsed;
    }

    const imported = await import(pathToFileURL(absolutePath).href);
    const resolvedConfig = isPlainObject(imported.default)
      ? imported.default
      : !("default" in imported) && isPlainObject(imported)
        ? imported
        : null;

    if (!resolvedConfig) {
      throw new Error("Config module must export an object");
    }

    return resolvedConfig;
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new AppError({
      stage: "load-config",
      message: `Unable to load config file: ${absolutePath}. ${message}`,
      cause,
    });
  }
}

/**
 * @param {unknown} value
 */
function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
