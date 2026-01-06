/**
 * CLI argument parser
 * Zero-dependency argument parsing for npm-llms
 * @module cli/args
 */

import type { OutputFormat, AIProviderName, ContentPriority } from '../types.js';

/**
 * Parsed CLI arguments
 */
export interface ParsedArgs {
  /** Command to execute */
  command: 'extract' | 'cache-clear' | 'help' | 'version';

  /** Package specifier (name@version) */
  package?: string;

  /** Output formats */
  formats: OutputFormat[];

  /** Output directory */
  output: string;

  /** Token limit for llms.txt */
  tokenLimit: number;

  /** Content priorities */
  priorities: ContentPriority[];

  /** AI provider */
  ai?: AIProviderName;

  /** AI API key */
  aiKey?: string;

  /** AI model */
  aiModel?: string;

  /** Enable AI enrichment */
  enrichWithAI: boolean;

  /** Cache enabled */
  cache: boolean;

  /** Cache directory */
  cacheDir: string;

  /** Ignore cache */
  ignoreCache: boolean;

  /** Verbose output */
  verbose: boolean;

  /** Print to stdout instead of files */
  stdout: boolean;

  /** Show help for specific command */
  helpCommand?: string;
}

/**
 * Default argument values
 */
const DEFAULTS: ParsedArgs = {
  command: 'extract',
  formats: ['llms', 'llms-full', 'markdown', 'json'],
  output: '.',
  tokenLimit: 2000,
  priorities: ['functions', 'examples'],
  enrichWithAI: false,
  cache: true,
  cacheDir: '.npm-llms-cache',
  ignoreCache: false,
  verbose: false,
  stdout: false,
};

/**
 * Valid output formats
 */
const VALID_FORMATS: OutputFormat[] = ['llms', 'llms-full', 'markdown', 'json', 'html'];

/**
 * Valid AI providers
 */
const VALID_AI_PROVIDERS: AIProviderName[] = ['claude', 'openai', 'gemini', 'ollama', 'groq'];

/**
 * Valid content priorities
 */
const VALID_PRIORITIES: ContentPriority[] = [
  'functions',
  'classes',
  'interfaces',
  'types',
  'examples',
  'readme',
];

/**
 * Parse CLI arguments
 * @param argv - Command line arguments (process.argv.slice(2))
 * @returns Parsed arguments
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { ...DEFAULTS };
  let i = 0;

  // Check for commands
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    args.command = 'help';
    return args;
  }

  if (argv[0] === '--version' || argv[0] === '-v' || argv[0] === '-V') {
    args.command = 'version';
    return args;
  }

  // Special commands
  if (argv[0] === 'cache-clear' || argv[0] === 'cache:clear') {
    args.command = 'cache-clear';
    i = 1;
  } else if (argv[0] === 'help') {
    args.command = 'help';
    args.helpCommand = argv[1];
    return args;
  } else if (argv[0] === 'extract') {
    args.command = 'extract';
    i = 1;
  }

  while (i < argv.length) {
    const arg = argv[i];

    // Package name (positional)
    if (!arg.startsWith('-') && !args.package) {
      args.package = arg;
      i++;
      continue;
    }

    // Format flags
    if (arg === '-f' || arg === '--format') {
      const value = argv[++i];
      if (value) {
        args.formats = parseFormats(value);
      }
      i++;
      continue;
    }

    // Single format shortcuts
    if (arg === '--llms') {
      args.formats = ['llms'];
      i++;
      continue;
    }

    if (arg === '--llms-full') {
      args.formats = ['llms-full'];
      i++;
      continue;
    }

    if (arg === '--markdown' || arg === '--md') {
      args.formats = ['markdown'];
      i++;
      continue;
    }

    if (arg === '--json') {
      args.formats = ['json'];
      i++;
      continue;
    }

    if (arg === '--all') {
      args.formats = ['llms', 'llms-full', 'markdown', 'json'];
      i++;
      continue;
    }

    // Output directory
    if (arg === '-o' || arg === '--output') {
      args.output = argv[++i] || '.';
      i++;
      continue;
    }

    // Token limit
    if (arg === '-t' || arg === '--token-limit') {
      const value = parseInt(argv[++i], 10);
      if (!isNaN(value) && value > 0) {
        args.tokenLimit = value;
      }
      i++;
      continue;
    }

    // Priorities
    if (arg === '-p' || arg === '--prioritize') {
      const value = argv[++i];
      if (value) {
        args.priorities = parsePriorities(value);
      }
      i++;
      continue;
    }

    // AI flags
    if (arg === '--ai') {
      const value = argv[++i] as AIProviderName;
      if (value && VALID_AI_PROVIDERS.includes(value)) {
        args.ai = value;
        args.enrichWithAI = true;
      }
      i++;
      continue;
    }

    if (arg === '--ai-key') {
      args.aiKey = argv[++i];
      i++;
      continue;
    }

    if (arg === '--ai-model') {
      args.aiModel = argv[++i];
      i++;
      continue;
    }

    if (arg === '--enrich') {
      args.enrichWithAI = true;
      i++;
      continue;
    }

    // Cache flags
    if (arg === '--no-cache') {
      args.cache = false;
      i++;
      continue;
    }

    if (arg === '--cache-dir') {
      args.cacheDir = argv[++i] || '.npm-llms-cache';
      i++;
      continue;
    }

    if (arg === '--ignore-cache' || arg === '--fresh') {
      args.ignoreCache = true;
      i++;
      continue;
    }

    // Output flags
    if (arg === '--verbose' || arg === '-V') {
      args.verbose = true;
      i++;
      continue;
    }

    if (arg === '--stdout') {
      args.stdout = true;
      i++;
      continue;
    }

    // Help
    if (arg === '-h' || arg === '--help') {
      args.command = 'help';
      i++;
      continue;
    }

    // Version
    if (arg === '-v' || arg === '--version') {
      args.command = 'version';
      i++;
      continue;
    }

    // Unknown flag
    i++;
  }

  return args;
}

/**
 * Parse format string into array
 */
function parseFormats(value: string): OutputFormat[] {
  const formats = value.split(',').map((s) => s.trim().toLowerCase());
  return formats.filter((f): f is OutputFormat =>
    VALID_FORMATS.includes(f as OutputFormat)
  );
}

/**
 * Parse priority string into array
 */
function parsePriorities(value: string): ContentPriority[] {
  const priorities = value.split(',').map((s) => s.trim().toLowerCase());
  return priorities.filter((p): p is ContentPriority =>
    VALID_PRIORITIES.includes(p as ContentPriority)
  );
}

/**
 * Generate help text
 */
export function getHelpText(command?: string): string {
  if (command === 'extract') {
    return `
npm-llms extract - Extract LLM-optimized documentation from NPM packages

Usage:
  npm-llms extract <package[@version]> [options]

Arguments:
  package           Package name with optional version (e.g., lodash, zod@3.22.0)

Options:
  -f, --format      Output formats (comma-separated): llms,llms-full,markdown,json
  -o, --output      Output directory (default: current directory)
  -t, --token-limit Token limit for llms.txt (default: 2000)
  -p, --prioritize  Content priorities (comma-separated): functions,classes,interfaces,types,examples,readme

Format shortcuts:
  --llms            Generate only llms.txt
  --llms-full       Generate only llms-full.txt
  --markdown, --md  Generate only API.md
  --json            Generate only api.json
  --all             Generate all formats

AI options:
  --ai <provider>   AI provider: claude, openai, gemini, ollama, groq
  --ai-key <key>    API key for AI provider
  --ai-model <id>   Model identifier
  --enrich          Enable AI enrichment

Cache options:
  --no-cache        Disable caching
  --cache-dir       Cache directory (default: .npm-llms-cache)
  --ignore-cache    Ignore cache and fetch fresh data

Output options:
  --stdout          Print to stdout instead of files
  --verbose, -V     Enable verbose output

Examples:
  npm-llms extract lodash
  npm-llms extract zod@3.22.0 --llms
  npm-llms extract @anthropic-ai/sdk -f llms,json -o ./docs
  npm-llms extract express --ai claude --ai-key $ANTHROPIC_API_KEY
`.trim();
  }

  if (command === 'cache-clear') {
    return `
npm-llms cache-clear - Clear the package cache

Usage:
  npm-llms cache-clear [options]

Options:
  --cache-dir       Cache directory (default: .npm-llms-cache)

Examples:
  npm-llms cache-clear
  npm-llms cache-clear --cache-dir ./my-cache
`.trim();
  }

  return `
npm-llms - Extract LLM-optimized documentation from NPM packages

Usage:
  npm-llms <command> [options]

Commands:
  extract <package>  Extract documentation from an NPM package
  cache-clear        Clear the package cache
  help [command]     Show help for a command
  version            Show version number

Options:
  -h, --help         Show help
  -v, --version      Show version

Examples:
  npm-llms extract lodash
  npm-llms extract zod@3.22.0 --llms
  npm-llms cache-clear

For more information on a command, run:
  npm-llms help <command>
`.trim();
}

/**
 * Get version from package.json
 */
export function getVersion(): string {
  // In production, this would be injected at build time
  return '1.0.0';
}
