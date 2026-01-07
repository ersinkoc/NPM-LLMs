# npm-llms Specification

## Overview

**Package Name:** `@oxog/npm-llms`
**Version:** 1.0.0
**License:** MIT
**Author:** Ersin Koç

**One-line Description:** Extract LLM-optimized documentation (llms.txt, llms-full.txt) from any NPM package with AI enrichment.

**Detailed Description:** This package downloads any NPM package from the registry, analyzes its source code (TypeScript declarations, JSDoc comments, README), and generates LLM-friendly documentation in multiple formats. It supports AI-powered enrichment to fill in missing documentation using Claude, OpenAI, Gemini, or local Ollama models. Perfect for feeding documentation to Cursor, Claude Code, Windsurf, and other AI coding assistants.

---

## Core Requirements

### 1. Zero Runtime Dependencies

The package MUST have no runtime dependencies. Only devDependencies are allowed:

```json
{
  "dependencies": {},
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

### 2. 100% Test Coverage

- Every line of code must be tested
- Every branch must be tested
- Every function must be tested
- All tests must pass (100% success rate)
- Coverage thresholds enforced in vitest.config.ts

### 3. TypeScript Strict Mode

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

### 4. Module Formats

- ESM (primary)
- CJS (compatibility)
- TypeScript declarations (.d.ts)

### 5. Node.js Compatibility

- Minimum Node.js version: 18
- Uses native fetch API (Node 18+)
- Uses native zlib for decompression

---

## Architecture

### Micro-Kernel Design

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

### Kernel Responsibilities

1. **Plugin Registration & Lifecycle**
   - Register plugins with validation
   - Manage plugin dependencies
   - Handle plugin initialization/destruction

2. **Event Bus**
   - Inter-plugin communication
   - Lifecycle events (beforeParse, afterParse, beforeOutput, afterOutput)

3. **Error Boundary**
   - Graceful error handling
   - Plugin isolation (one plugin failure doesn't crash others)

4. **Configuration Management**
   - Merge default and user configs
   - Environment variable support

5. **NPM Package Fetching**
   - Download package metadata from registry
   - Download and extract tarballs
   - Handle scoped packages (@org/name)

6. **Cache Management**
   - Cache downloaded packages
   - Cache AI responses
   - Configurable TTL

7. **Token Counting**
   - Approximate token count for llms.txt optimization
   - Support for different tokenization strategies

---

## Plugin Interface

```typescript
interface Plugin<TContext = ExtractorContext> {
  /** Unique plugin identifier (kebab-case) */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Plugin category for organization */
  category: 'parser' | 'output' | 'ai' | 'utility';

  /** Other plugins this plugin depends on */
  dependencies?: string[];

  /** Called when plugin is registered */
  install: (kernel: Kernel<TContext>) => void;

  /** Called after all plugins are installed */
  onInit?: (context: TContext) => void | Promise<void>;

  /** Called when plugin is unregistered */
  onDestroy?: () => void | Promise<void>;

  /** Called on error in this plugin */
  onError?: (error: Error) => void;
}
```

---

## Core Plugins

### Parser Plugins

| Plugin | Description | Priority |
|--------|-------------|----------|
| `dts-parser` | Parse TypeScript declaration files (.d.ts) | 1 (highest) |
| `ts-source-parser` | Parse TypeScript source files | 2 |
| `jsdoc-parser` | Extract JSDoc comments and annotations | 3 |
| `readme-parser` | Parse README.md for description and examples | 4 |

### Output Plugins

| Plugin | Description | Token Limit |
|--------|-------------|-------------|
| `llms-output` | Generate llms.txt format | < 2000 tokens |
| `llms-full-output` | Generate llms-full.txt (complete) | No limit |
| `markdown-output` | Generate API.md documentation | No limit |
| `json-output` | Generate structured JSON | No limit |

### Optional Plugins

| Plugin | Description | Requires |
|--------|-------------|----------|
| `changelog-parser` | Parse CHANGELOG.md | N/A |
| `html-output` | Generate HTML documentation | N/A |
| `claude-ai` | Claude API for AI enrichment | API Key |
| `openai-ai` | OpenAI API for AI enrichment | API Key |
| `gemini-ai` | Google Gemini for AI enrichment | API Key |
| `ollama-ai` | Local Ollama for privacy | Ollama running |
| `groq-ai` | Groq API for fast inference | API Key |

---

## API Design

### Main Export

```typescript
import {
  createExtractor,
  type Extractor,
  type ExtractorOptions,
  type ExtractResult,
  type Plugin
} from '@oxog/npm-llms';
```

### Factory Function

```typescript
function createExtractor(options?: ExtractorOptions): Extractor;
```

### Extractor Interface

```typescript
interface Extractor {
  /** Extract documentation from a package */
  extract(packageSpec: string, options?: ExtractOptions): Promise<ExtractResult>;

  /** Fetch package without extraction */
  fetch(packageSpec: string): Promise<PackageInfo>;

  /** Register a plugin */
  use(plugin: Plugin): this;

  /** Unregister a plugin */
  unregister(name: string): boolean;

  /** List all registered plugins */
  listPlugins(): PluginInfo[];

  /** Clear cache */
  clearCache(): Promise<void>;

  /** Get cache stats */
  getCacheStats(): CacheStats;
}
```

### Options Types

```typescript
interface ExtractorOptions {
  cache?: CacheOptions;
  ai?: AIProviderOptions;
  plugins?: Plugin[];
  registry?: string;
  tempDir?: string;
}

interface CacheOptions {
  enabled?: boolean;
  dir?: string;
  ttl?: number;
}

interface AIProviderOptions {
  provider: 'claude' | 'openai' | 'gemini' | 'ollama' | 'groq';
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeout?: number;
}

interface ExtractOptions {
  formats?: OutputFormat[];
  enrichWithAI?: boolean;
  aiTasks?: AITask[];
  llmsTokenLimit?: number;
  prioritize?: ContentPriority[];
  ignoreCache?: boolean;
}
```

### Result Types

```typescript
interface ExtractResult {
  package: PackageMetadata;
  api: APIEntry[];
  outputs: Record<OutputFormat, string>;
  tokenCount: number;
  truncated: boolean;
  duration: number;
  fromCache: boolean;
}

interface APIEntry {
  kind: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'enum';
  name: string;
  signature: string;
  description?: string;
  params?: ParamDoc[];
  returns?: ReturnDoc;
  examples?: string[];
  isDefault?: boolean;
  sourceFile?: string;
  line?: number;
}

interface ParamDoc {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  defaultValue?: string;
}

interface ReturnDoc {
  type: string;
  description?: string;
}
```

---

## CLI Interface

```bash
npx @oxog/npm-llms <package>[@version] [options]

Options:
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

Environment Variables:
  ANTHROPIC_API_KEY      Claude API key
  OPENAI_API_KEY         OpenAI API key
  GOOGLE_API_KEY         Gemini API key
  GROQ_API_KEY           Groq API key
  NPM_LLMS_CACHE_DIR     Custom cache directory
```

---

## Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| `PACKAGE_NOT_FOUND` | Package doesn't exist on npm | Check package name spelling |
| `VERSION_NOT_FOUND` | Specified version doesn't exist | Check available versions |
| `DOWNLOAD_FAILED` | Failed to download tarball | Check network connection |
| `PARSE_ERROR` | Failed to parse source | Report issue with package name |
| `AI_ERROR` | AI provider request failed | Check API key and quota |
| `CACHE_ERROR` | Cache operation failed | Check disk space/permissions |
| `PLUGIN_ERROR` | Plugin failed to initialize | Check plugin dependencies |
| `CONFIG_ERROR` | Invalid configuration | Check options format |

---

## File Structure

```
npm-llms/
├── src/
│   ├── index.ts                    # Main entry, public exports
│   ├── kernel.ts                   # Micro kernel core
│   ├── types.ts                    # All type definitions
│   ├── errors.ts                   # Custom error classes
│   ├── core/
│   │   ├── fetcher.ts              # NPM package fetcher
│   │   ├── extractor.ts            # Main extractor logic
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
│   │   └── optional/               # Optional plugins
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
│   ├── integration/
│   └── fixtures/
├── examples/
│   ├── 01-basic/
│   ├── 02-formats/
│   ├── 03-ai-enrichment/
│   ├── 04-plugins/
│   ├── 05-cli/
│   └── 06-real-world/
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
└── vitest.config.ts
```

---

## Bundle Size Requirements

| Component | Max Size (gzipped) |
|-----------|-------------------|
| Core (kernel + types) | < 3KB |
| Parser plugins | < 2KB |
| Output plugins | < 2KB |
| Total (core only) | < 8KB |
| Total (all plugins) | < 20KB |

---

## Performance Requirements

| Operation | Max Time |
|-----------|----------|
| Parse small package (.d.ts < 10KB) | < 100ms |
| Parse medium package (.d.ts < 100KB) | < 500ms |
| Parse large package (.d.ts < 1MB) | < 2s |
| Generate llms.txt | < 50ms |
| Token counting | < 10ms |
| Cache lookup | < 5ms |

---

## Security Considerations

1. **No eval/Function constructor** - All parsing done with regex/state machines
2. **Input sanitization** - Package names validated before use
3. **Path traversal prevention** - Tar extraction validates paths
4. **API key handling** - Never logged, only in memory
5. **Network security** - HTTPS only for registry and AI providers

---

## Compatibility Matrix

| Environment | Support |
|-------------|---------|
| Node.js 18.x | Full |
| Node.js 20.x | Full |
| Node.js 22.x | Full |
| Deno | Partial (needs compat) |
| Bun | Full |
| Browser | No (Node.js APIs required) |

---

## Success Criteria

1. ✅ Zero runtime dependencies
2. ✅ 100% test coverage
3. ✅ TypeScript strict mode passes
4. ✅ All core plugins functional
5. ✅ CLI works as documented
6. ✅ Bundle size within limits
7. ✅ Performance within requirements
8. ✅ 15+ examples provided
9. ✅ Documentation website complete
10. ✅ llms.txt < 2000 tokens
