# npm-llms - Zero-Dependency NPM Package

## Package Identity

| Field | Value |
|-------|-------|
| **NPM Package** | `@oxog/npm-llms` |
| **GitHub Repository** | `https://github.com/ersinkoc/npm-llms` |
| **Documentation Site** | `https://npm-llms.oxog.dev` |
| **License** | MIT |
| **Author** | Ersin Koç (ersinkoc) |

> **NO social media, Discord, email, or external links allowed.**

---

## Package Description

**One-line:** Extract LLM-optimized documentation (llms.txt, llms-full.txt) from any NPM package with AI enrichment

This package downloads any NPM package from the registry, analyzes its source code (TypeScript declarations, JSDoc comments, README), and generates LLM-friendly documentation in multiple formats. It supports AI-powered enrichment to fill in missing documentation using Claude, OpenAI, Gemini, or local Ollama models. Perfect for feeding documentation to Cursor, Claude Code, Windsurf, and other AI coding assistants.

---

## NON-NEGOTIABLE RULES

These rules are **ABSOLUTE** and must be followed without exception.

### 1. ZERO RUNTIME DEPENDENCIES

```json
{
  "dependencies": {}  // MUST BE EMPTY - NO EXCEPTIONS
}
```

- Implement EVERYTHING from scratch
- No lodash, no axios, no moment - nothing
- Write your own utilities, parsers, validators
- If you think you need a dependency, you don't
- **CRITICAL**: No `ts-morph`, no `typescript` package - implement AST parsing manually or use TypeScript Compiler API via optional peer dependency

**Allowed devDependencies only:**
```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^2.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "tsup": "^8.0.0",
    "@types/node": "^20.0.0",
    "prettier": "^3.0.0",
    "eslint": "^9.0.0"
  }
}
```

### 2. 100% TEST COVERAGE

- Every line of code must be tested
- Every branch must be tested
- Every function must be tested
- **All tests must pass** (100% success rate)
- Use Vitest for testing
- Coverage thresholds enforced in config

### 3. MICRO-KERNEL ARCHITECTURE

All packages MUST use plugin-based architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                      User Code                               │
│   npx @oxog/npm-llms lodash --ai=claude --all               │
├─────────────────────────────────────────────────────────────┤
│                   Plugin Registry API                        │
│      use() · register() · unregister() · list()             │
├───────────┬───────────┬───────────┬─────────────────────────┤
│  Parser   │  Output   │    AI     │     Community           │
│  Plugins  │  Plugins  │  Plugins  │      Plugins            │
├───────────┼───────────┼───────────┼─────────────────────────┤
│ • dts     │ • llms    │ • claude  │ • custom-parser         │
│ • ts-src  │ • llms-ful│ • openai  │ • custom-formatter      │
│ • jsdoc   │ • markdown│ • gemini  │ • mcp-server            │
│ • readme  │ • json    │ • ollama  │                         │
│ • changel.│ • html    │ • groq    │                         │
├───────────┴───────────┴───────────┴─────────────────────────┤
│                     Micro Kernel                             │
│   NPM Fetcher · AST Walker · Token Counter · Cache          │
└─────────────────────────────────────────────────────────────┘
```

**Kernel responsibilities (minimal):**
- Plugin registration and lifecycle
- Event bus for inter-plugin communication
- Error boundary and recovery
- Configuration management
- NPM package fetching and extraction
- AST walking infrastructure
- Token counting for llms.txt optimization
- Cache management

### 4. DEVELOPMENT WORKFLOW

Create these documents **FIRST**, before any code:

1. **SPECIFICATION.md** - Complete package specification
2. **IMPLEMENTATION.md** - Architecture and design decisions  
3. **TASKS.md** - Ordered task list with dependencies

Only after all three documents are complete, implement code following TASKS.md sequentially.

### 5. TYPESCRIPT STRICT MODE

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "moduleResolution": "bundler",
    "target": "ES2022",
    "module": "ESNext"
  }
}
```

### 6. LLM-NATIVE DESIGN

Package must be designed for both humans AND AI assistants:

- **llms.txt** file in root (< 2000 tokens)
- **Predictable API** naming (`create`, `get`, `set`, `use`, `remove`)
- **Rich JSDoc** with @example on every public API
- **15+ examples** organized by category
- **README** optimized for LLM consumption

### 7. NO EXTERNAL LINKS

- ✅ GitHub repository URL
- ✅ Custom domain (npm-llms.oxog.dev)
- ✅ npm package URL
- ❌ Social media (Twitter, LinkedIn, etc.)
- ❌ Discord/Slack links
- ❌ Email addresses
- ❌ Donation/sponsor links

---

## CORE FEATURES

### 1. NPM Package Fetching

Download any package from NPM registry by name and optional version.

**API Example:**
```typescript
import { createExtractor } from '@oxog/npm-llms';

const extractor = createExtractor();

// Fetch latest version
const pkg = await extractor.fetch('lodash');

// Fetch specific version
const pkg = await extractor.fetch('lodash@4.17.21');

// Fetch scoped package
const pkg = await extractor.fetch('@oxog/codeshine@1.0.0');
```

### 2. Hybrid Source Parsing

Automatically detect and parse the best available source: `.d.ts` files first, then TypeScript source, then JavaScript with JSDoc.

**API Example:**
```typescript
const result = await extractor.extract('lodash@4.17.21');

// Result contains parsed API information
console.log(result.functions);   // Array of function definitions
console.log(result.classes);     // Array of class definitions
console.log(result.interfaces);  // Array of interface definitions
console.log(result.types);       // Array of type aliases
console.log(result.constants);   // Array of exported constants
```

### 3. Multiple Output Formats

Generate documentation in 5 different formats optimized for different use cases.

**API Example:**
```typescript
const result = await extractor.extract('lodash', {
  formats: ['llms', 'llms-full', 'markdown', 'json', 'html']
});

// Access generated content
console.log(result.outputs.llms);      // llms.txt content (< 2000 tokens)
console.log(result.outputs.llmsFull);  // llms-full.txt content (complete)
console.log(result.outputs.markdown);  // API.md content
console.log(result.outputs.json);      // Structured JSON
console.log(result.outputs.html);      // HTML documentation
```

### 4. AI-Powered Enrichment

Use AI to fill in missing documentation, generate examples, and improve descriptions.

**API Example:**
```typescript
const extractor = createExtractor({
  ai: {
    provider: 'claude',
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514'
  }
});

const result = await extractor.extract('some-package', {
  enrichWithAI: true,
  aiTasks: ['descriptions', 'examples', 'summary']
});

// AI-enriched documentation
console.log(result.outputs.llmsFull); // Now includes AI-generated content
```

### 5. CLI Interface

Full-featured command-line interface for quick documentation generation.

**API Example:**
```bash
# Basic usage - generates all formats
npx @oxog/npm-llms lodash

# Specific version
npx @oxog/npm-llms lodash@4.17.21

# With AI enrichment
npx @oxog/npm-llms lodash --ai=claude

# Specific formats only
npx @oxog/npm-llms lodash --format=llms,markdown

# Custom output directory
npx @oxog/npm-llms lodash -o ./docs

# With caching disabled
npx @oxog/npm-llms lodash --no-cache

# Verbose output
npx @oxog/npm-llms lodash -v
```

### 6. Smart Caching

Cache downloaded packages and AI responses to avoid redundant work.

**API Example:**
```typescript
const extractor = createExtractor({
  cache: {
    enabled: true,
    dir: '.npm-llms-cache',
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
  }
});

// First call downloads and caches
await extractor.extract('lodash@4.17.21');

// Second call uses cache (instant)
await extractor.extract('lodash@4.17.21');

// Force refresh
await extractor.extract('lodash@4.17.21', { ignoreCache: true });

// Clear cache
await extractor.clearCache();
```

### 7. Token Counting & Optimization

Ensure llms.txt stays within token limits for optimal LLM consumption.

**API Example:**
```typescript
const result = await extractor.extract('lodash', {
  llmsTokenLimit: 2000,  // Maximum tokens for llms.txt
  prioritize: ['functions', 'examples'] // What to include first
});

console.log(result.tokenCount); // Actual token count
console.log(result.truncated);  // Whether content was truncated
```

---

## PLUGIN SYSTEM

### Plugin Interface

```typescript
/**
 * Plugin interface for extending kernel functionality.
 * 
 * @typeParam TContext - Shared context type between plugins
 */
export interface Plugin<TContext = ExtractorContext> {
  /** Unique plugin identifier (kebab-case) */
  name: string;
  
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  
  /** Plugin category for organization */
  category: 'parser' | 'output' | 'ai' | 'utility';
  
  /** Other plugins this plugin depends on */
  dependencies?: string[];
  
  /**
   * Called when plugin is registered.
   * @param kernel - The kernel instance
   */
  install: (kernel: Kernel<TContext>) => void;
  
  /**
   * Called after all plugins are installed.
   * @param context - Shared context object
   */
  onInit?: (context: TContext) => void | Promise<void>;
  
  /**
   * Called when plugin is unregistered.
   */
  onDestroy?: () => void | Promise<void>;
  
  /**
   * Called on error in this plugin.
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;
}
```

### Core Plugins (Always Loaded)

| Plugin | Description |
|--------|-------------|
| `dts-parser` | Parse TypeScript declaration files (.d.ts) |
| `ts-source-parser` | Parse TypeScript source files when .d.ts unavailable |
| `jsdoc-parser` | Extract JSDoc comments and annotations |
| `readme-parser` | Parse README.md for package description and examples |
| `llms-output` | Generate llms.txt format (< 2000 tokens) |
| `llms-full-output` | Generate llms-full.txt format (complete content) |
| `markdown-output` | Generate API.md documentation |
| `json-output` | Generate structured JSON output |

### Optional Plugins (Opt-in)

| Plugin | Description | Enable |
|--------|-------------|--------|
| `changelog-parser` | Parse CHANGELOG.md for version history | `extractor.use(changelogPlugin)` |
| `html-output` | Generate HTML documentation | `extractor.use(htmlOutputPlugin)` |
| `claude-ai` | Claude API for AI enrichment | `extractor.use(claudePlugin)` |
| `openai-ai` | OpenAI API for AI enrichment | `extractor.use(openaiPlugin)` |
| `gemini-ai` | Google Gemini for AI enrichment | `extractor.use(geminiPlugin)` |
| `ollama-ai` | Local Ollama for privacy-focused AI | `extractor.use(ollamaPlugin)` |
| `groq-ai` | Groq API for fast inference | `extractor.use(groqPlugin)` |

---

## API DESIGN

### Main Export

```typescript
import { 
  createExtractor, 
  type Extractor,
  type ExtractorOptions,
  type ExtractResult,
  type Plugin
} from '@oxog/npm-llms';

// Create with defaults
const extractor = createExtractor();

// Create with options
const extractor = createExtractor({
  cache: { enabled: true, dir: '.cache' },
  ai: { provider: 'claude', apiKey: '...' },
  plugins: [customPlugin]
});

// Extract documentation
const result = await extractor.extract('package-name@version', {
  formats: ['llms', 'llms-full', 'markdown', 'json'],
  enrichWithAI: true
});

// Plugin management
extractor.use(myPlugin);
extractor.unregister('plugin-name');
extractor.listPlugins();
```

### Type Definitions

```typescript
/**
 * Configuration options for the extractor.
 */
export interface ExtractorOptions {
  /**
   * Cache configuration for packages and AI responses.
   * @default { enabled: true, dir: '.npm-llms-cache', ttl: 604800000 }
   */
  cache?: CacheOptions;
  
  /**
   * AI provider configuration for documentation enrichment.
   * @default undefined (AI disabled)
   */
  ai?: AIProviderOptions;
  
  /**
   * Additional plugins to load on creation.
   * @default []
   */
  plugins?: Plugin[];
  
  /**
   * NPM registry URL.
   * @default 'https://registry.npmjs.org'
   */
  registry?: string;
  
  /**
   * Temporary directory for package extraction.
   * @default os.tmpdir()
   */
  tempDir?: string;
}

/**
 * Cache configuration options.
 */
export interface CacheOptions {
  /** Enable caching. @default true */
  enabled?: boolean;
  /** Cache directory. @default '.npm-llms-cache' */
  dir?: string;
  /** Cache TTL in milliseconds. @default 604800000 (7 days) */
  ttl?: number;
}

/**
 * AI provider configuration.
 */
export interface AIProviderOptions {
  /** AI provider name */
  provider: 'claude' | 'openai' | 'gemini' | 'ollama' | 'groq';
  /** API key for the provider */
  apiKey?: string;
  /** Model identifier */
  model?: string;
  /** Base URL for API (useful for Ollama) */
  baseUrl?: string;
  /** Request timeout in ms. @default 30000 */
  timeout?: number;
}

/**
 * Options for the extract method.
 */
export interface ExtractOptions {
  /** Output formats to generate. @default ['llms', 'llms-full', 'markdown', 'json'] */
  formats?: OutputFormat[];
  /** Enable AI enrichment. @default false */
  enrichWithAI?: boolean;
  /** AI tasks to perform. @default ['descriptions', 'examples', 'summary'] */
  aiTasks?: AITask[];
  /** Maximum tokens for llms.txt. @default 2000 */
  llmsTokenLimit?: number;
  /** Content to prioritize when truncating. @default ['functions', 'examples'] */
  prioritize?: ContentPriority[];
  /** Ignore cache and force fresh extraction. @default false */
  ignoreCache?: boolean;
}

/**
 * Result of package extraction.
 */
export interface ExtractResult {
  /** Package metadata */
  package: PackageMetadata;
  /** Parsed API entries */
  api: APIEntry[];
  /** Generated outputs by format */
  outputs: Record<OutputFormat, string>;
  /** Token count for llms.txt */
  tokenCount: number;
  /** Whether content was truncated */
  truncated: boolean;
  /** Extraction duration in ms */
  duration: number;
  /** Cache status */
  fromCache: boolean;
}

/**
 * Single API entry (function, class, interface, etc.)
 */
export interface APIEntry {
  /** Entry type */
  kind: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'enum';
  /** Export name */
  name: string;
  /** Full TypeScript signature */
  signature: string;
  /** Description from JSDoc or AI */
  description?: string;
  /** Parameter documentation */
  params?: ParamDoc[];
  /** Return value documentation */
  returns?: ReturnDoc;
  /** Usage examples */
  examples?: string[];
  /** Whether this is a default export */
  isDefault?: boolean;
  /** Source file path */
  sourceFile?: string;
  /** Line number in source */
  line?: number;
}

type OutputFormat = 'llms' | 'llms-full' | 'markdown' | 'json' | 'html';
type AITask = 'descriptions' | 'examples' | 'summary' | 'params' | 'returns';
type ContentPriority = 'functions' | 'classes' | 'interfaces' | 'types' | 'examples' | 'readme';
```

### CLI Interface

```bash
# Usage
npx @oxog/npm-llms <package>[@version] [options]

# Options
  -o, --output <dir>     Output directory (default: ./npm-llms-output)
  -f, --format <formats> Comma-separated formats: llms,llms-full,markdown,json,html
  --ai <provider>        Enable AI enrichment: claude,openai,gemini,ollama,groq
  --api-key <key>        API key for AI provider (or use env var)
  --no-cache             Disable caching
  --clear-cache          Clear cache before extraction
  -v, --verbose          Verbose output
  -q, --quiet            Suppress output except errors
  --version              Show version
  -h, --help             Show help

# Environment Variables
  ANTHROPIC_API_KEY      Claude API key
  OPENAI_API_KEY         OpenAI API key
  GOOGLE_API_KEY         Gemini API key
  GROQ_API_KEY           Groq API key
  NPM_LLMS_CACHE_DIR     Custom cache directory

# Examples
  npx @oxog/npm-llms lodash
  npx @oxog/npm-llms @oxog/codeshine@1.0.0 --ai=claude
  npx @oxog/npm-llms express -f llms,markdown -o ./docs
  npx @oxog/npm-llms react --ai=openai --api-key=$OPENAI_API_KEY
```

---

## TECHNICAL REQUIREMENTS

| Requirement | Value |
|-------------|-------|
| Runtime | Node.js only |
| Module Format | ESM + CJS (dual) |
| Node.js Version | >= 18 |
| TypeScript Version | >= 5.0 |
| Bundle Size (core) | < 8KB gzipped |
| Bundle Size (all plugins) | < 20KB gzipped |

---

## IMPLEMENTATION DETAILS

### NPM Package Fetching (No Dependencies)

```typescript
// Use native Node.js fetch (available in Node 18+)
async function fetchPackageMetadata(name: string, version?: string): Promise<PackageMetadata> {
  const encodedName = encodeURIComponent(name).replace('%40', '@');
  const url = `https://registry.npmjs.org/${encodedName}`;
  
  const response = await fetch(url);
  if (!response.ok) throw new PackageNotFoundError(name);
  
  const data = await response.json();
  const resolvedVersion = version || data['dist-tags'].latest;
  const versionData = data.versions[resolvedVersion];
  
  if (!versionData) throw new VersionNotFoundError(name, version);
  
  return {
    name: versionData.name,
    version: resolvedVersion,
    tarball: versionData.dist.tarball,
    types: versionData.types || versionData.typings,
    main: versionData.main,
    exports: versionData.exports
  };
}
```

### Tarball Extraction (Using Node.js Built-ins)

```typescript
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';

// Implement tar extraction without dependencies
// Parse tar format manually - it's a simple format:
// - 512-byte headers
// - File content padded to 512-byte blocks
async function extractTarball(tarballUrl: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  
  const response = await fetch(tarballUrl);
  if (!response.ok || !response.body) throw new DownloadError(tarballUrl);
  
  // Stream through gunzip, then parse tar
  const gunzip = createGunzip();
  // Custom tar parser implementation...
}
```

### TypeScript Declaration Parsing (Lightweight)

```typescript
// Instead of ts-morph (heavy), implement lightweight .d.ts parser
// Focus on extracting:
// - export function/const/class/interface/type declarations
// - JSDoc comments
// - Type signatures

interface DtsParser {
  parse(content: string): APIEntry[];
}

// Use regex + simple state machine for .d.ts files
// They're already simplified and don't need full TS compilation
function parseDtsFile(content: string): APIEntry[] {
  const entries: APIEntry[] = [];
  
  // Match exported declarations
  const exportRegex = /export\s+(declare\s+)?(function|const|class|interface|type|enum)\s+(\w+)/g;
  // ... implementation
  
  return entries;
}
```

### Token Counting (Approximation)

```typescript
/**
 * Approximate token count using GPT-4 tokenizer rules.
 * ~4 characters per token for English text.
 * More accurate than naive word count.
 */
function countTokens(text: string): number {
  // Remove code blocks for more accurate count
  const withoutCode = text.replace(/```[\s\S]*?```/g, (match) => {
    // Code is ~3 chars per token
    return ' '.repeat(Math.ceil(match.length / 3));
  });
  
  // ~4 chars per token for prose
  return Math.ceil(withoutCode.length / 4);
}
```

### AI Provider Abstraction

```typescript
interface AIProvider {
  name: string;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

// Each AI plugin implements this interface
// Plugins handle their own HTTP requests using native fetch
```

---

## LLM-NATIVE REQUIREMENTS

### 1. llms.txt File

Create `/llms.txt` in project root (< 2000 tokens):

```markdown
# npm-llms

> Extract LLM-optimized documentation (llms.txt) from any NPM package with AI enrichment

## Install

```bash
npm install @oxog/npm-llms
```

## Basic Usage

```typescript
import { createExtractor } from '@oxog/npm-llms';
const extractor = createExtractor();
const result = await extractor.extract('lodash');
console.log(result.outputs.llms); // llms.txt content
```

## API Summary

### Extractor
- `createExtractor(options?)` - Create new extractor instance
- `extract(package, options?)` - Extract documentation from package
- `fetch(package)` - Download package without extraction
- `use(plugin)` - Register a plugin
- `unregister(name)` - Remove a plugin

### Core Plugins (Auto-loaded)
- `dts-parser` - Parse .d.ts declaration files
- `ts-source-parser` - Parse TypeScript source
- `jsdoc-parser` - Extract JSDoc comments
- `readme-parser` - Parse README.md
- `llms-output` - Generate llms.txt
- `llms-full-output` - Generate llms-full.txt
- `markdown-output` - Generate API.md
- `json-output` - Generate JSON

### Optional Plugins
- `changelog-parser` - Parse CHANGELOG.md
- `html-output` - Generate HTML docs
- `claude-ai` - Claude enrichment
- `openai-ai` - OpenAI enrichment
- `gemini-ai` - Gemini enrichment
- `ollama-ai` - Local Ollama enrichment

## Common Patterns

### Basic Extraction
```typescript
const result = await extractor.extract('express');
await writeFile('llms.txt', result.outputs.llms);
```

### With AI Enrichment
```typescript
const extractor = createExtractor({
  ai: { provider: 'claude', apiKey: process.env.ANTHROPIC_API_KEY }
});
const result = await extractor.extract('package', { enrichWithAI: true });
```

### CLI Usage
```bash
npx @oxog/npm-llms lodash --ai=claude -o ./docs
```

## Errors

| Code | Meaning | Solution |
|------|---------|----------|
| `PACKAGE_NOT_FOUND` | Package doesn't exist on npm | Check package name spelling |
| `VERSION_NOT_FOUND` | Specified version doesn't exist | Check available versions |
| `DOWNLOAD_FAILED` | Failed to download tarball | Check network connection |
| `PARSE_ERROR` | Failed to parse source | Report issue with package name |
| `AI_ERROR` | AI provider request failed | Check API key and quota |

## Links

- Docs: https://npm-llms.oxog.dev
- GitHub: https://github.com/ersinkoc/npm-llms
```

### 2. API Naming Standards

Use predictable patterns LLMs can infer:

```typescript
// ✅ GOOD - Predictable
createExtractor()   // Factory function
extract()           // Main action
fetch()             // Download
use()               // Register plugin
unregister()        // Remove plugin
listPlugins()       // Get all plugins
clearCache()        // Clear cache

// ❌ BAD - Unpredictable
init(), spawn(), make()
proc(), handle(), do()
```

---

## WEBSITE REQUIREMENTS

Documentation website using React 19, Vite 6, Tailwind CSS v4, and @oxog/codeshine.

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| Vite | 6.x | Build Tool |
| TypeScript | 5.x | Type Safety |
| Tailwind CSS | 4.x | Styling (CSS-first) |
| shadcn/ui | latest | UI Components |
| @oxog/codeshine | latest | Syntax Highlighting |
| Lucide React | latest | Icons |
| React Router | 7.x | Routing |

### @oxog/codeshine Integration

Use @oxog/codeshine for ALL code blocks:
```tsx
import { CodeBlock } from '@oxog/codeshine/react';

// Theme must sync with app theme
const codeTheme = isDarkMode ? 'github-dark' : 'github-light';

<CodeBlock 
  code={code} 
  language="typescript" 
  theme={codeTheme}
  lineNumbers
  copyButton
/>
```

### Required Features
- IDE-style code blocks with macOS traffic lights
- Dark/Light theme toggle (synced with codeshine)
- GitHub star button with real count
- Footer: "Made with ❤️ by Ersin KOÇ"
- Links to github.com/ersinkoc/npm-llms
- npm package link
- CNAME: npm-llms.oxog.dev

### Site Structure

```
website/
├── public/
│   ├── CNAME           # npm-llms.oxog.dev
│   └── llms.txt        # Copied from root
├── src/
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── docs/
│   │   ├── api/
│   │   ├── Examples.tsx
│   │   └── Plugins.tsx
│   ├── components/
│   │   ├── layout/
│   │   ├── code/
│   │   └── common/
│   └── ...
└── ...
```

---

## GITHUB ACTIONS

Single workflow file: `.github/workflows/deploy.yml`

```yaml
name: Deploy Website

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Build package
        run: npm run build
      
      - name: Build website
        working-directory: ./website
        run: |
          npm ci
          npm run build
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './website/dist'
  
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## PROJECT STRUCTURE

```
npm-llms/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── src/
│   ├── index.ts                    # Main entry, public exports
│   ├── kernel.ts                   # Micro kernel core
│   ├── types.ts                    # All type definitions
│   ├── errors.ts                   # Custom error classes
│   ├── core/
│   │   ├── fetcher.ts              # NPM package fetcher
│   │   ├── extractor.ts            # Tarball extraction
│   │   ├── cache.ts                # Cache management
│   │   └── tokens.ts               # Token counting
│   ├── parsers/
│   │   ├── dts.ts                  # .d.ts parser
│   │   ├── typescript.ts           # TS source parser
│   │   ├── jsdoc.ts                # JSDoc extractor
│   │   └── readme.ts               # README parser
│   ├── outputs/
│   │   ├── llms.ts                 # llms.txt generator
│   │   ├── llms-full.ts            # llms-full.txt generator
│   │   ├── markdown.ts             # Markdown generator
│   │   └── json.ts                 # JSON generator
│   ├── plugins/
│   │   ├── index.ts                # Plugin exports
│   │   ├── core/                   # Core plugins
│   │   │   ├── dts-parser.ts
│   │   │   ├── ts-source-parser.ts
│   │   │   ├── jsdoc-parser.ts
│   │   │   ├── readme-parser.ts
│   │   │   ├── llms-output.ts
│   │   │   ├── llms-full-output.ts
│   │   │   ├── markdown-output.ts
│   │   │   └── json-output.ts
│   │   └── optional/               # Optional plugins
│   │       ├── changelog-parser.ts
│   │       ├── html-output.ts
│   │       ├── claude-ai.ts
│   │       ├── openai-ai.ts
│   │       ├── gemini-ai.ts
│   │       ├── ollama-ai.ts
│   │       └── groq-ai.ts
│   ├── cli/
│   │   ├── index.ts                # CLI entry
│   │   ├── commands.ts             # Command handlers
│   │   └── args.ts                 # Argument parsing
│   └── utils/
│       ├── tar.ts                  # Tar parsing (no deps)
│       ├── http.ts                 # HTTP utilities
│       └── fs.ts                   # File system utilities
├── tests/
│   ├── unit/
│   │   ├── kernel.test.ts
│   │   ├── fetcher.test.ts
│   │   ├── parsers/
│   │   └── outputs/
│   ├── integration/
│   │   ├── extract.test.ts
│   │   └── cli.test.ts
│   └── fixtures/
│       ├── sample-package/
│       └── mock-responses/
├── examples/
│   ├── 01-basic/
│   │   ├── minimal.ts
│   │   ├── with-options.ts
│   │   └── README.md
│   ├── 02-formats/
│   │   ├── llms-only.ts
│   │   ├── all-formats.ts
│   │   └── README.md
│   ├── 03-ai-enrichment/
│   │   ├── with-claude.ts
│   │   ├── with-openai.ts
│   │   ├── with-ollama.ts
│   │   └── README.md
│   ├── 04-plugins/
│   │   ├── custom-parser.ts
│   │   ├── custom-output.ts
│   │   └── README.md
│   ├── 05-cli/
│   │   ├── basic-usage.sh
│   │   ├── with-ai.sh
│   │   └── README.md
│   └── 06-real-world/
│       ├── generate-for-cursor/
│       ├── batch-extraction/
│       └── README.md
├── website/                        # React + Vite docs site
├── llms.txt
├── SPECIFICATION.md
├── IMPLEMENTATION.md
├── TASKS.md
├── README.md
├── CHANGELOG.md
├── LICENSE
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── .gitignore
```

---

## CONFIG FILES

### package.json

```json
{
  "name": "@oxog/npm-llms",
  "version": "1.0.0",
  "description": "Extract LLM-optimized documentation (llms.txt) from any NPM package with AI enrichment",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "npm-llms": "./dist/cli/index.js"
  },
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./plugins": {
      "import": {
        "types": "./dist/plugins/index.d.ts",
        "default": "./dist/plugins/index.js"
      },
      "require": {
        "types": "./dist/plugins/index.d.cts",
        "default": "./dist/plugins/index.cjs"
      }
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src/",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "npm run build && npm run test:coverage"
  },
  "keywords": [
    "llms",
    "llms-txt",
    "documentation",
    "npm",
    "api-docs",
    "typescript",
    "zero-dependency",
    "ai",
    "claude",
    "openai",
    "cursor",
    "windsurf"
  ],
  "author": "Ersin Koç",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/ersinkoc/npm-llms.git"
  },
  "bugs": {
    "url": "https://github.com/ersinkoc/npm-llms/issues"
  },
  "homepage": "https://npm-llms.oxog.dev",
  "engines": {
    "node": ">=18"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@vitest/coverage-v8": "^2.0.0",
    "eslint": "^9.0.0",
    "prettier": "^3.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

### tsup.config.ts

```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts', 
    'src/plugins/index.ts',
    'src/cli/index.ts'
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  banner: {
    // Add shebang for CLI
    js: (ctx) => ctx.options.entry?.includes('cli') 
      ? '#!/usr/bin/env node' 
      : ''
  }
});
```

### vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        'website/',
        'examples/',
        '*.config.*',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
```

---

## IMPLEMENTATION CHECKLIST

### Before Starting
- [ ] Create SPECIFICATION.md with complete spec
- [ ] Create IMPLEMENTATION.md with architecture
- [ ] Create TASKS.md with ordered task list
- [ ] All three documents reviewed and complete

### During Implementation
- [ ] Follow TASKS.md sequentially
- [ ] Write tests before or with each feature
- [ ] Maintain 100% coverage throughout
- [ ] JSDoc on every public API with @example
- [ ] Create examples as features are built

### Package Completion
- [ ] All tests passing (100%)
- [ ] Coverage at 100% (lines, branches, functions)
- [ ] No TypeScript errors
- [ ] ESLint passes
- [ ] Package builds without errors
- [ ] CLI works correctly

### LLM-Native Completion
- [ ] llms.txt created (< 2000 tokens)
- [ ] llms.txt copied to website/public/
- [ ] README first 500 tokens optimized
- [ ] All public APIs have JSDoc + @example
- [ ] 15+ examples in organized folders
- [ ] package.json has 12 keywords
- [ ] API uses standard naming patterns

### Website Completion
- [ ] All pages implemented
- [ ] IDE-style code blocks with line numbers
- [ ] Copy buttons working
- [ ] Dark/Light theme toggle
- [ ] CNAME file with npm-llms.oxog.dev
- [ ] Mobile responsive
- [ ] Footer with Ersin Koç, MIT, GitHub only

### Final Verification
- [ ] `npm run build` succeeds
- [ ] `npm run test:coverage` shows 100%
- [ ] Website builds without errors
- [ ] All examples run successfully
- [ ] README is complete and accurate
- [ ] CLI help text is accurate

---

## BEGIN IMPLEMENTATION

Start by creating **SPECIFICATION.md** with the complete package specification based on everything above.

Then create **IMPLEMENTATION.md** with architecture decisions.

Then create **TASKS.md** with ordered, numbered tasks.

Only after all three documents are complete, begin implementing code by following TASKS.md sequentially.

**Remember:**
- This package will be published to npm
- It must be production-ready
- Zero runtime dependencies
- 100% test coverage
- Professionally documented
- LLM-native design
- Beautiful documentation website
- CLI must work flawlessly
