export class AppError extends Error {
  /**
   * @param {object} args
   * @param {string} args.message
   * @param {string} args.stage
   * @param {string | undefined} [args.command]
   * @param {number | undefined} [args.exitCode]
   * @param {string | undefined} [args.stderr]
   * @param {unknown} [args.cause]
   */
  constructor({ message, stage, command, exitCode, stderr, cause }) {
    super(message);
    this.name = "AppError";
    this.stage = stage;
    this.command = command;
    this.exitCode = exitCode;
    this.stderr = stderr;
    this.cause = cause;
  }
}

/**
 * @param {unknown} error
 */
export function isAppError(error) {
  return error instanceof AppError;
}

/**
 * @param {unknown} error
 */
export function formatError(error) {
  if (isAppError(error)) {
    const lines = [`Error [${error.stage}]: ${error.message}`];

    if (error.command) {
      lines.push(`Command: ${error.command}`);
    }

    if (typeof error.exitCode === "number") {
      lines.push(`Exit code: ${error.exitCode}`);
    }

    if (error.stderr) {
      lines.push(`Details: ${trimToSingleLine(error.stderr)}`);
    }

    return lines.join("\n");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * @param {string} input
 */
function trimToSingleLine(input) {
  const normalized = input.replace(/\s+/g, " ").trim();
  if (normalized.length <= 400) {
    return normalized;
  }

  return `${normalized.slice(0, 397)}...`;
}
