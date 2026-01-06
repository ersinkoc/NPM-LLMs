/**
 * CLI commands implementation
 * @module cli/commands
 */

import { createWriteStream } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { ParsedArgs } from './args.js';
import { getHelpText, getVersion } from './args.js';
import { createExtractor } from '../core/extractor.js';
import type { ExtractResult, OutputFormat } from '../types.js';

/**
 * Output file names for each format
 */
const OUTPUT_FILES: Record<OutputFormat, string> = {
  llms: 'llms.txt',
  'llms-full': 'llms-full.txt',
  markdown: 'API.md',
  json: 'api.json',
  html: 'api.html',
};

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Check if output supports colors
 */
function supportsColor(): boolean {
  return process.stdout.isTTY === true && !process.env['NO_COLOR'];
}

/**
 * Format text with color (if supported)
 */
function color(text: string, colorCode: string): string {
  return supportsColor() ? `${colorCode}${text}${colors.reset}` : text;
}

/**
 * Log info message
 */
function info(message: string): void {
  console.log(color('i', colors.blue), message);
}

/**
 * Log success message
 */
function success(message: string): void {
  console.log(color('✓', colors.green), message);
}

/**
 * Log warning message
 */
function warn(message: string): void {
  console.log(color('⚠', colors.yellow), message);
}

/**
 * Log error message
 */
function error(message: string): void {
  console.error(color('✗', colors.red), message);
}

/**
 * Execute extract command
 */
export async function executeExtract(args: ParsedArgs): Promise<void> {
  if (!args.package) {
    error('Package name is required');
    console.log('\nUsage: npm-llms extract <package[@version]>');
    process.exit(1);
  }

  const startTime = Date.now();

  if (args.verbose) {
    info(`Extracting documentation for ${color(args.package, colors.cyan)}`);
  }

  try {
    // Create extractor with options
    const extractor = createExtractor({
      cache: args.cache
        ? {
            enabled: true,
            dir: args.cacheDir,
          }
        : { enabled: false },
      verbose: args.verbose,
      ai: args.ai
        ? {
            provider: args.ai,
            apiKey: args.aiKey,
            model: args.aiModel,
          }
        : undefined,
    });

    // Extract documentation
    const result = await extractor.extract(args.package, {
      formats: args.formats,
      enrichWithAI: args.enrichWithAI,
      llmsTokenLimit: args.tokenLimit,
      prioritize: args.priorities,
      ignoreCache: args.ignoreCache,
    });

    // Output results
    if (args.stdout) {
      await outputToStdout(result, args.formats);
    } else {
      await outputToFiles(result, args);
    }

    const duration = Date.now() - startTime;

    if (args.verbose || !args.stdout) {
      printSummary(result, args, duration);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`Failed to extract documentation: ${errorMessage}`);
    if (args.verbose && err instanceof Error && err.stack) {
      console.error(color(err.stack, colors.dim));
    }
    process.exit(1);
  }
}

/**
 * Output result to stdout
 */
async function outputToStdout(result: ExtractResult, formats: OutputFormat[]): Promise<void> {
  for (const format of formats) {
    const content = result.outputs[format];
    if (content) {
      if (formats.length > 1) {
        console.log(`\n--- ${format} ---\n`);
      }
      console.log(content);
    }
  }
}

/**
 * Output result to files
 */
async function outputToFiles(result: ExtractResult, args: ParsedArgs): Promise<void> {
  // Ensure output directory exists
  await mkdir(args.output, { recursive: true });

  for (const format of args.formats) {
    const content = result.outputs[format];
    if (content) {
      const filename = OUTPUT_FILES[format];
      const filepath = join(args.output, filename);
      await writeFile(filepath, content, 'utf-8');

      if (args.verbose) {
        success(`Created ${filepath}`);
      }
    }
  }
}

/**
 * Print extraction summary
 */
function printSummary(result: ExtractResult, args: ParsedArgs, duration: number): void {
  console.log();
  console.log(
    color('Package:', colors.dim),
    `${result.package.name}@${result.package.version}`
  );
  console.log(color('API entries:', colors.dim), result.api.length);
  console.log(color('Token count:', colors.dim), result.tokenCount);

  if (result.truncated) {
    warn('Content was truncated to fit token limit');
  }

  if (result.fromCache) {
    console.log(color('Source:', colors.dim), 'cache');
  }

  console.log(color('Duration:', colors.dim), `${duration}ms`);

  if (!args.stdout) {
    console.log();
    console.log(color('Output files:', colors.bold));
    for (const format of args.formats) {
      if (result.outputs[format]) {
        const filename = OUTPUT_FILES[format];
        console.log(`  ${color('•', colors.green)} ${join(args.output, filename)}`);
      }
    }
  }

  console.log();
  success('Documentation extracted successfully');
}

/**
 * Execute cache clear command
 */
export async function executeCacheClear(args: ParsedArgs): Promise<void> {
  try {
    info(`Clearing cache at ${args.cacheDir}`);

    // Remove cache directory
    await rm(args.cacheDir, { recursive: true, force: true });

    success('Cache cleared successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    error(`Failed to clear cache: ${errorMessage}`);
    process.exit(1);
  }
}

/**
 * Execute help command
 */
export function executeHelp(args: ParsedArgs): void {
  console.log(getHelpText(args.helpCommand));
}

/**
 * Execute version command
 */
export function executeVersion(): void {
  console.log(`npm-llms v${getVersion()}`);
}

/**
 * Execute command based on parsed args
 */
export async function executeCommand(args: ParsedArgs): Promise<void> {
  switch (args.command) {
    case 'extract':
      await executeExtract(args);
      break;
    case 'cache-clear':
      await executeCacheClear(args);
      break;
    case 'help':
      executeHelp(args);
      break;
    case 'version':
      executeVersion();
      break;
    default:
      error(`Unknown command: ${args.command}`);
      process.exit(1);
  }
}
