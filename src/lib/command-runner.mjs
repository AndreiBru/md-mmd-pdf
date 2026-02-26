import { spawn } from "child_process";
import { AppError } from "./errors.mjs";

/**
 * @typedef {object} RunCommandOptions
 * @property {string} stage
 * @property {boolean} verbose
 * @property {string | undefined} [cwd]
 */

/**
 * @param {string} command
 * @param {string[]} args
 * @param {RunCommandOptions} options
 * @returns {Promise<{ stdout: string, stderr: string }>}
 */
export function runCommand(command, args, options) {
  const commandLabel = formatCommand(command, args);

  if (options.verbose) {
    process.stdout.write(`$ ${commandLabel}\n`);
  }

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout += text;
      if (options.verbose) {
        process.stdout.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = String(chunk);
      stderr += text;
      if (options.verbose) {
        process.stderr.write(text);
      }
    });

    child.on("error", (cause) => {
      reject(
        new AppError({
          stage: options.stage,
          message: `Failed to start command: ${cause.message}`,
          command: commandLabel,
          stderr,
          cause,
        }),
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new AppError({
            stage: options.stage,
            message: "Command exited with a non-zero status",
            command: commandLabel,
            exitCode: code ?? undefined,
            stderr,
          }),
        );
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

/**
 * @param {string} command
 * @param {string[]} args
 */
function formatCommand(command, args) {
  return [quoteArg(command), ...args.map(quoteArg)].join(" ");
}

/**
 * @param {string} arg
 */
function quoteArg(arg) {
  if (/^[A-Za-z0-9_./:@=-]+$/.test(arg)) {
    return arg;
  }

  return JSON.stringify(arg);
}
