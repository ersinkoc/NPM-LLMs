#!/usr/bin/env node
/**
 * CLI for npm-llms
 * Extract LLM-optimized documentation from NPM packages
 * @module cli
 */

import { cli } from '@oxog/cli';
import { spinnerPlugin, loggerPlugin, colorPlugin } from '@oxog/cli/plugins';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createExtractor } from '../core/extractor.js';
import type { OutputFormat, ContentPriority, AIProviderName } from '../types.js';

const VERSION = '1.0.0';

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

const VALID_FORMATS: OutputFormat[] = ['llms', 'llms-full', 'markdown', 'json', 'html'];
const VALID_PRIORITIES: ContentPriority[] = [
  'functions',
  'classes',
  'interfaces',
  'types',
  'examples',
  'readme',
];

function parseFormats(value: string | undefined): OutputFormat[] {
  if (!value) return ['llms', 'llms-full', 'markdown', 'json'];
  const formats = value.split(',').map((s) => s.trim().toLowerCase());
  return formats.filter((f): f is OutputFormat => VALID_FORMATS.includes(f as OutputFormat));
}

function parsePriorities(value: string | undefined): ContentPriority[] {
  if (!value) return ['functions', 'examples'];
  const priorities = value.split(',').map((s) => s.trim().toLowerCase());
  return priorities.filter((p): p is ContentPriority =>
    VALID_PRIORITIES.includes(p as ContentPriority)
  );
}

/**
 * Show help text
 */
function showHelp(): void {
  console.log(`
npm-llms v${VERSION}
Extract LLM-optimized documentation from NPM packages

Usage:
  npm-llms <package[@version]> [options]
  npm-llms extract <package[@version]> [options]
  npm-llms cache-clear [options]

Arguments:
  package           Package name with optional version (e.g., lodash, zod@3.22.0)

Options:
  -f, --format <formats>    Output formats (comma-separated): llms,llms-full,markdown,json
  -o, --output <dir>        Output directory (default: current directory)
  -t, --token-limit <n>     Token limit for llms.txt (default: no limit)
  -p, --prioritize <list>   Content priorities: functions,classes,interfaces,types,examples,readme

Format shortcuts:
  --llms                    Generate only llms.txt
  --llms-full               Generate only llms-full.txt
  --markdown, --md          Generate only API.md
  --json                    Generate only api.json
  --all                     Generate all formats (default)

AI options:
  --ai <provider>           AI provider: claude, openai, gemini, ollama, groq
  --ai-key <key>            API key for AI provider
  --ai-model <model>        AI model identifier
  --enrich                  Enable AI enrichment

Cache options:
  --no-cache                Disable caching
  --cache-dir <dir>         Cache directory (default: .npm-llms-cache)
  --ignore-cache, --fresh   Ignore cache and fetch fresh

Output options:
  --stdout                  Print to stdout instead of files
  --verbose, -V             Enable verbose output

Other:
  -h, --help                Show this help
  -v, --version             Show version number

Examples:
  npm-llms lodash
  npm-llms zod@3.22.0 --llms
  npm-llms express -f llms,json -o ./docs
  npm-llms @anthropic-ai/sdk --verbose
  npm-llms cache-clear
`);
}

/**
 * Extract documentation handler
 */
async function handleExtract(
  packageName: string,
  options: Record<string, any>,
  ctx: any
): Promise<void> {
  const { spinner, logger, color } = ctx;

  // Determine formats
  let formats: OutputFormat[];
  if (options.llms) {
    formats = ['llms'];
  } else if (options['llms-full']) {
    formats = ['llms-full'];
  } else if (options.markdown || options.md) {
    formats = ['markdown'];
  } else if (options.json) {
    formats = ['json'];
  } else if (options.all || !options.format) {
    formats = parseFormats(options.format);
  } else {
    formats = parseFormats(options.format);
  }

  const output = (options.output as string) || '.';
  const tokenLimit = options['token-limit'] ? parseInt(options['token-limit'], 10) : Infinity;
  const priorities = parsePriorities(options.prioritize);
  const cacheEnabled = options.cache !== false;
  const cacheDir = (options['cache-dir'] as string) || '.npm-llms-cache';
  const ignoreCache = options['ignore-cache'] || options.fresh || false;
  const verbose = options.verbose || options.V || false;
  const stdout = options.stdout || false;
  const aiProvider = options.ai as AIProviderName | undefined;
  const enrichWithAI = options.enrich || !!aiProvider;

  // Start spinner (only if not stdout mode)
  const spin = !stdout && spinner ? spinner.start(`Extracting documentation for ${color?.cyan?.(packageName) || packageName}...`) : null;

  try {
    const extractor = createExtractor({
      cache: cacheEnabled ? { enabled: true, dir: cacheDir } : { enabled: false },
      verbose,
      ai: aiProvider
        ? {
            provider: aiProvider,
            apiKey: options['ai-key'],
            model: options['ai-model'],
          }
        : undefined,
    });

    const result = await extractor.extract(packageName, {
      formats,
      enrichWithAI,
      llmsTokenLimit: tokenLimit,
      prioritize: priorities,
      ignoreCache,
    });

    // Output results
    if (stdout) {
      for (const format of formats) {
        const content = result.outputs[format];
        if (content) {
          if (formats.length > 1) {
            console.log(`\n--- ${format} ---\n`);
          }
          console.log(content);
        }
      }
    } else {
      await mkdir(output, { recursive: true });
      for (const format of formats) {
        const content = result.outputs[format];
        if (content) {
          const filename = OUTPUT_FILES[format];
          const filepath = join(output, filename);
          await writeFile(filepath, content, 'utf-8');
        }
      }
      spin?.succeed('Documentation extracted!');
    }

    // Print summary
    if (!stdout) {
      console.log();
      console.log(color?.dim?.('Package:') || 'Package:', `${result.package.name}@${result.package.version}`);
      console.log(color?.dim?.('API entries:') || 'API entries:', result.api.length);
      console.log(color?.dim?.('Token count:') || 'Token count:', result.tokenCount);

      if (result.truncated) {
        logger?.warn?.('Content was truncated to fit token limit');
      }

      if (result.fromCache) {
        console.log(color?.dim?.('Source:') || 'Source:', 'cache');
      }

      console.log();
      console.log(color?.bold?.('Output files:') || 'Output files:');
      for (const format of formats) {
        if (result.outputs[format]) {
          const filename = OUTPUT_FILES[format];
          console.log(`  ${color?.green?.('•') || '•'} ${join(output, filename)}`);
        }
      }
      console.log();
    }
  } catch (err) {
    spin?.fail?.('Extraction failed');
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${errorMessage}`);
    if (verbose && err instanceof Error && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

/**
 * Cache clear handler
 */
async function handleCacheClear(options: Record<string, any>): Promise<void> {
  const cacheDir = (options['cache-dir'] as string) || '.npm-llms-cache';
  try {
    console.log(`Clearing cache at ${cacheDir}...`);
    await rm(cacheDir, { recursive: true, force: true });
    console.log('Cache cleared successfully');
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Failed to clear cache: ${errorMessage}`);
    process.exit(1);
  }
}

// Pre-process argv for special cases
const argv = process.argv.slice(2);

// Handle --help / -h
if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
  showHelp();
  process.exit(0);
}

// Handle --version / -v
if (argv.includes('--version') || argv.includes('-v')) {
  console.log(`npm-llms v${VERSION}`);
  process.exit(0);
}

// Handle cache-clear command
if (argv[0] === 'cache-clear' || argv[0] === 'cache:clear') {
  const options: Record<string, any> = {};
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--cache-dir' && argv[i + 1]) {
      options['cache-dir'] = argv[++i];
    }
  }
  handleCacheClear(options);
} else {
  // Create CLI for extract command
  const app = cli('npm-llms')
    .version(VERSION)
    .describe('Extract LLM-optimized documentation from NPM packages')
    .use(spinnerPlugin())
    .use(loggerPlugin({ level: 'info' }))
    .use(colorPlugin());

  // Determine if first arg is 'extract' or a package name
  let effectiveArgv = argv;
  if (argv[0] && !argv[0].startsWith('-') && argv[0] !== 'extract') {
    // First arg is a package name, prepend 'extract'
    effectiveArgv = ['extract', ...argv];
  }

  // Extract command
  app
    .command('extract')
    .description('Extract documentation from an NPM package')
    .argument('<package>', 'Package name with optional version')
    .option('-f, --format <formats>', 'Output formats')
    .option('-o, --output <dir>', 'Output directory')
    .option('-t, --token-limit <n>', 'Token limit')
    .option('-p, --prioritize <priorities>', 'Content priorities')
    .option('--llms', 'Generate only llms.txt')
    .option('--llms-full', 'Generate only llms-full.txt')
    .option('--markdown', 'Generate only API.md')
    .option('--md', 'Generate only API.md')
    .option('--json', 'Generate only api.json')
    .option('--all', 'Generate all formats')
    .option('--ai <provider>', 'AI provider')
    .option('--ai-key <key>', 'API key')
    .option('--ai-model <model>', 'AI model')
    .option('--enrich', 'Enable AI enrichment')
    .option('--no-cache', 'Disable caching')
    .option('--cache-dir <dir>', 'Cache directory')
    .option('--ignore-cache', 'Ignore cache')
    .option('--fresh', 'Ignore cache')
    .option('--verbose', 'Verbose output')
    .option('-V', 'Verbose output')
    .option('--stdout', 'Print to stdout')
    .action(async (ctx: any) => {
      const { args, options } = ctx;
      await handleExtract(args.package as string, options, ctx);
    });

  // Run with effective argv
  app.run(effectiveArgv);
}
