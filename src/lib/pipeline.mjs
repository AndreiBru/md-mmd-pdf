import { mkdir, rm, stat } from "fs/promises";
import { dirname, join, parse, resolve } from "path";
import { fileURLToPath } from "url";
import { AppError } from "./errors.mjs";
import { runCommand } from "./command-runner.mjs";
import { loadMdToPdfConfig } from "./config-loader.mjs";

/**
 * @typedef {object} ConvertOptions
 * @property {string} inputPath
 * @property {string | undefined} outputPath
 * @property {string | undefined} configPath
 * @property {string | undefined} mermaidConfigPath
 * @property {string | undefined} puppeteerConfigPath
 * @property {boolean} verbose
 * @property {boolean} keepTemp
 */

/**
 * @param {ConvertOptions} options
 */
export async function convertMarkdownToPdf(options) {
  const inputPath = resolve(options.inputPath);
  await ensureInputExists(inputPath);

  const inputDir = dirname(inputPath);
  const inputName = parse(inputPath).name;
  const outputPath = resolve(
    options.outputPath ?? join(inputDir, `${inputName}.pdf`),
  );

  const token = `${Date.now()}-${process.pid}-${Math.random().toString(16).slice(2, 8)}`;
  const tempMarkdownPath = join(inputDir, `.${inputName}.md-mmd-pdf.${token}.md`);
  const tempArtefactsDir = join(
    inputDir,
    `.${inputName}.md-mmd-pdf.${token}.artefacts`,
  );

  const cleanupTargets = [tempMarkdownPath, tempArtefactsDir];

  try {
    await mkdir(tempArtefactsDir, { recursive: true });

    await renderMermaidMarkdown({
      inputPath,
      tempMarkdownPath,
      tempArtefactsDir,
      mermaidConfigPath: options.mermaidConfigPath,
      puppeteerConfigPath: options.puppeteerConfigPath,
      verbose: options.verbose,
    });

    await renderPdf({
      transformedMarkdownPath: tempMarkdownPath,
      outputPath,
      basedir: inputDir,
      configPath: options.configPath,
      verbose: options.verbose,
    });

    return {
      outputPath,
      diagramsPath: tempArtefactsDir,
      transformedMarkdownPath: tempMarkdownPath,
      keptTemp: options.keepTemp,
    };
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error;
  } finally {
    if (!options.keepTemp) {
      await Promise.all(
        cleanupTargets.map((target) =>
          rm(target, { recursive: true, force: true }),
        ),
      );
    }
  }
}

/**
 * @param {string} inputPath
 */
async function ensureInputExists(inputPath) {
  let inputStat;

  try {
    inputStat = await stat(inputPath);
  } catch (cause) {
    throw new AppError({
      stage: "validate-input",
      message: `Input file not found: ${inputPath}`,
      cause,
    });
  }

  if (!inputStat.isFile()) {
    throw new AppError({
      stage: "validate-input",
      message: `Input path is not a file: ${inputPath}`,
    });
  }
}

/**
 * @param {object} args
 * @param {string} args.inputPath
 * @param {string} args.tempMarkdownPath
 * @param {string} args.tempArtefactsDir
 * @param {string | undefined} args.mermaidConfigPath
 * @param {string | undefined} args.puppeteerConfigPath
 * @param {boolean} args.verbose
 */
async function renderMermaidMarkdown(args) {
  const mmdcPath = await getMmdcPath();

  const commandArgs = [
    mmdcPath,
    "-i",
    args.inputPath,
    "-o",
    args.tempMarkdownPath,
    "-a",
    args.tempArtefactsDir,
    "-e",
    "svg",
  ];

  if (args.mermaidConfigPath) {
    commandArgs.push("-c", resolve(args.mermaidConfigPath));
  }

  if (args.puppeteerConfigPath) {
    commandArgs.push("-p", resolve(args.puppeteerConfigPath));
  }

  await runCommand(process.execPath, commandArgs, {
    stage: "mermaid-render",
    verbose: args.verbose,
  });
}

/**
 * @param {object} args
 * @param {string} args.transformedMarkdownPath
 * @param {string} args.outputPath
 * @param {string} args.basedir
 * @param {string | undefined} args.configPath
 * @param {boolean} args.verbose
 */
async function renderPdf(args) {
  let mdToPdf;

  try {
    const mdToPdfModule = await import("md-to-pdf");
    mdToPdf = mdToPdfModule.mdToPdf ?? mdToPdfModule.default;
  } catch (cause) {
    throw new AppError({
      stage: "pdf-render",
      message: "Unable to import md-to-pdf",
      cause,
    });
  }

  if (typeof mdToPdf !== "function") {
    throw new AppError({
      stage: "pdf-render",
      message: "md-to-pdf import did not expose a callable API",
    });
  }

  const userConfig = await loadMdToPdfConfig(args.configPath);
  const config = {
    ...userConfig,
    basedir: args.basedir,
    dest: args.outputPath,
  };

  if (args.verbose) {
    process.stdout.write(
      `$ mdToPdf(path=${args.transformedMarkdownPath}, dest=${args.outputPath})\n`,
    );
  }

  try {
    await mdToPdf({ path: args.transformedMarkdownPath }, config);
  } catch (cause) {
    throw new AppError({
      stage: "pdf-render",
      message: "md-to-pdf failed to generate output",
      cause,
    });
  }
}

async function getMmdcPath() {
  const packageRoot = resolve(fileURLToPath(new URL("../../", import.meta.url)));
  const mmdcPath = join(
    packageRoot,
    "node_modules",
    "@mermaid-js",
    "mermaid-cli",
    "src",
    "cli.js",
  );

  try {
    const mmdcStat = await stat(mmdcPath);
    if (!mmdcStat.isFile()) {
      throw new Error("Resolved Mermaid CLI entrypoint is not a file");
    }
    return mmdcPath;
  } catch (cause) {
    throw new AppError({
      stage: "mermaid-render",
      message:
        "Cannot find Mermaid CLI executable at package runtime dependency path",
      cause,
    });
  }
}
