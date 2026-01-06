# Implementation Guide

This document describes the architecture decisions and implementation details for `@oxog/npm-llms`.

---

## Core Architecture

### 1. Micro-Kernel Pattern

The package uses a micro-kernel architecture where the kernel provides minimal core functionality and all features are implemented as plugins.

```
┌──────────────────────────────────────────────────────┐
│                     Kernel                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │   Event     │  │   Plugin    │  │   Config    │  │
│  │    Bus      │  │  Registry   │  │  Manager    │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │    Error    │  │   Context   │  │   Logger    │  │
│  │  Boundary   │  │   Store     │  │             │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │ Parser  │    │ Output  │    │   AI    │
    │ Plugins │    │ Plugins │    │ Plugins │
    └─────────┘    └─────────┘    └─────────┘
```

### 2. Event-Driven Processing

All processing flows through events, allowing plugins to hook into any stage:

```typescript
// Event flow
'package:resolve'     → Resolve package name and version
'package:fetch'       → Download package tarball
'package:extract'     → Extract tarball contents
'parse:start'         → Begin parsing
'parse:file'          → Parse individual file
'parse:complete'      → Parsing finished
'enrich:start'        → Begin AI enrichment
'enrich:complete'     → AI enrichment finished
'output:start'        → Begin output generation
'output:format'       → Generate specific format
'output:complete'     → All outputs generated
```

### 3. Context Object

A shared context object flows through all processing stages:

```typescript
interface ExtractorContext {
  // Package info
  package: {
    name: string;
    version: string;
    description?: string;
    files: Map<string, string>; // path → content
  };

  // Parsed data
  api: APIEntry[];
  readme?: ParsedReadme;
  changelog?: ParsedChangelog;

  // Options
  options: ExtractOptions;

  // Results
  outputs: Map<OutputFormat, string>;
  tokenCount: number;
  truncated: boolean;

  // Metadata
  startTime: number;
  fromCache: boolean;
}
```

---

## Implementation Details

### NPM Package Fetching

Uses native `fetch` API (Node 18+) with no external dependencies:

```typescript
// src/core/fetcher.ts

const REGISTRY_URL = 'https://registry.npmjs.org';

async function fetchPackageMetadata(name: string): Promise<PackageMetadata> {
  // Handle scoped packages: @scope/name → @scope%2Fname
  const encodedName = name.startsWith('@')
    ? `@${encodeURIComponent(name.slice(1))}`
    : encodeURIComponent(name);

  const url = `${REGISTRY_URL}/${encodedName}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new PackageNotFoundError(name);
    }
    throw new DownloadError(`Failed to fetch metadata: ${response.status}`);
  }

  return response.json();
}

async function downloadTarball(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new DownloadError(`Failed to download tarball: ${response.status}`);
  }
  return response.arrayBuffer();
}
```

### Tar Extraction (Zero Dependencies)

Implement tar parsing from scratch using the tar format specification:

```typescript
// src/utils/tar.ts

// Tar file format:
// - 512-byte header for each file
// - File content padded to 512-byte blocks
// - Two 512-byte zero blocks at end

interface TarHeader {
  name: string;      // bytes 0-99
  mode: string;      // bytes 100-107
  uid: string;       // bytes 108-115
  gid: string;       // bytes 116-123
  size: number;      // bytes 124-135 (octal)
  mtime: number;     // bytes 136-147 (octal)
  checksum: number;  // bytes 148-155 (octal)
  type: string;      // byte 156
  linkname: string;  // bytes 157-256
  // UStar extension fields...
}

function parseTarHeader(buffer: Uint8Array, offset: number): TarHeader | null {
  // Check for end-of-archive (all zeros)
  const headerBytes = buffer.slice(offset, offset + 512);
  if (headerBytes.every(b => b === 0)) return null;

  const decoder = new TextDecoder();

  return {
    name: decoder.decode(headerBytes.slice(0, 100)).replace(/\0/g, ''),
    mode: decoder.decode(headerBytes.slice(100, 108)).replace(/\0/g, ''),
    uid: decoder.decode(headerBytes.slice(108, 116)).replace(/\0/g, ''),
    gid: decoder.decode(headerBytes.slice(116, 124)).replace(/\0/g, ''),
    size: parseInt(decoder.decode(headerBytes.slice(124, 136)).replace(/\0/g, ''), 8),
    mtime: parseInt(decoder.decode(headerBytes.slice(136, 148)).replace(/\0/g, ''), 8),
    checksum: parseInt(decoder.decode(headerBytes.slice(148, 156)).replace(/\0/g, ''), 8),
    type: decoder.decode(headerBytes.slice(156, 157)),
    linkname: decoder.decode(headerBytes.slice(157, 257)).replace(/\0/g, ''),
  };
}

async function* extractTar(buffer: ArrayBuffer): AsyncGenerator<TarEntry> {
  const data = new Uint8Array(buffer);
  let offset = 0;

  while (offset < data.length) {
    const header = parseTarHeader(data, offset);
    if (!header) break;

    offset += 512; // Skip header

    if (header.type === '0' || header.type === '') {
      // Regular file
      const content = data.slice(offset, offset + header.size);
      yield {
        path: header.name.replace(/^package\//, ''), // Remove package/ prefix
        content: new TextDecoder().decode(content),
        size: header.size,
      };
    }

    // Move to next header (content padded to 512 bytes)
    offset += Math.ceil(header.size / 512) * 512;
  }
}
```

### Gzip Decompression

Use Node.js built-in zlib:

```typescript
// src/utils/http.ts
import { gunzipSync } from 'node:zlib';

async function fetchAndExtract(tarballUrl: string): Promise<Map<string, string>> {
  const response = await fetch(tarballUrl);
  const gzipped = await response.arrayBuffer();

  // Decompress gzip
  const tarBuffer = gunzipSync(Buffer.from(gzipped));

  // Extract tar
  const files = new Map<string, string>();
  for await (const entry of extractTar(tarBuffer.buffer)) {
    files.set(entry.path, entry.content);
  }

  return files;
}
```

### TypeScript Declaration Parsing

Lightweight parser for .d.ts files using regex and state machine:

```typescript
// src/parsers/dts.ts

interface DtsParseResult {
  exports: APIEntry[];
  imports: string[];
}

// Match patterns for different declarations
const PATTERNS = {
  exportFunction: /export\s+(?:declare\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)\s*:\s*([^;{]+)/g,
  exportConst: /export\s+(?:declare\s+)?const\s+(\w+)\s*:\s*([^;=]+)/g,
  exportClass: /export\s+(?:declare\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/g,
  exportInterface: /export\s+(?:declare\s+)?interface\s+(\w+)(?:\s*<([^>]*)>)?(?:\s+extends\s+([^{]+))?\s*\{/g,
  exportType: /export\s+(?:declare\s+)?type\s+(\w+)(?:\s*<([^>]*)>)?\s*=\s*([^;]+)/g,
  exportEnum: /export\s+(?:declare\s+)?(?:const\s+)?enum\s+(\w+)\s*\{/g,
  jsdocComment: /\/\*\*[\s\S]*?\*\//g,
};

function parseDts(content: string): DtsParseResult {
  const exports: APIEntry[] = [];

  // Extract JSDoc comments with their positions
  const comments = extractJSDocComments(content);

  // Parse functions
  for (const match of content.matchAll(PATTERNS.exportFunction)) {
    const [fullMatch, name, generics, params, returnType] = match;
    const jsdoc = findPrecedingJSDoc(content, match.index!, comments);

    exports.push({
      kind: 'function',
      name,
      signature: `function ${name}${generics || ''}(${params}): ${returnType.trim()}`,
      description: jsdoc?.description,
      params: parseParams(params, jsdoc),
      returns: { type: returnType.trim(), description: jsdoc?.returns },
      examples: jsdoc?.examples,
    });
  }

  // Similar parsing for const, class, interface, type, enum...

  return { exports, imports: [] };
}
```

### JSDoc Extraction

Parse JSDoc comments into structured data:

```typescript
// src/parsers/jsdoc.ts

interface JSDocParsed {
  description?: string;
  params: Array<{ name: string; type?: string; description?: string }>;
  returns?: { type?: string; description?: string };
  examples: string[];
  deprecated?: string;
  since?: string;
  see: string[];
  throws: Array<{ type?: string; description?: string }>;
}

const JSDOC_TAGS = {
  param: /@param\s+(?:\{([^}]+)\})?\s*(\[?\w+\]?)\s*-?\s*(.*)/g,
  returns: /@returns?\s+(?:\{([^}]+)\})?\s*(.*)/g,
  example: /@example\s*([\s\S]*?)(?=@\w|$)/g,
  deprecated: /@deprecated\s*(.*)/g,
  since: /@since\s*(.*)/g,
  see: /@see\s*(.*)/g,
  throws: /@throws?\s+(?:\{([^}]+)\})?\s*(.*)/g,
};

function parseJSDoc(comment: string): JSDocParsed {
  // Remove comment markers
  const content = comment
    .replace(/^\/\*\*\s*/, '')
    .replace(/\s*\*\/$/, '')
    .replace(/^\s*\*\s?/gm, '');

  // Extract description (text before first @tag)
  const descMatch = content.match(/^([^@]*)/);
  const description = descMatch?.[1]?.trim();

  // Extract params
  const params: JSDocParsed['params'] = [];
  for (const match of content.matchAll(JSDOC_TAGS.param)) {
    params.push({
      type: match[1],
      name: match[2].replace(/[\[\]]/g, ''),
      description: match[3],
    });
  }

  // Extract examples
  const examples: string[] = [];
  for (const match of content.matchAll(JSDOC_TAGS.example)) {
    const example = match[1].trim();
    if (example) examples.push(example);
  }

  // Extract other tags...

  return { description, params, examples, returns: undefined, see: [], throws: [] };
}
```

### Token Counting

Approximate token count using GPT-4 tokenization rules:

```typescript
// src/core/tokens.ts

/**
 * Approximate token count.
 * Based on GPT-4 tokenization: ~4 chars per token for English text.
 * Code is ~3 chars per token due to more special tokens.
 */
export function countTokens(text: string): number {
  let tokens = 0;

  // Split into code blocks and text
  const parts = text.split(/(```[\s\S]*?```)/g);

  for (const part of parts) {
    if (part.startsWith('```')) {
      // Code blocks: ~3 chars per token
      tokens += Math.ceil(part.length / 3);
    } else {
      // Prose: ~4 chars per token
      tokens += Math.ceil(part.length / 4);
    }
  }

  return tokens;
}

/**
 * Truncate text to fit within token limit.
 * Preserves complete sections when possible.
 */
export function truncateToTokenLimit(
  text: string,
  limit: number,
  priorities: ContentPriority[] = ['functions', 'examples']
): { text: string; truncated: boolean } {
  const currentTokens = countTokens(text);
  if (currentTokens <= limit) {
    return { text, truncated: false };
  }

  // Parse sections and prioritize
  const sections = parseSections(text);
  const prioritized = prioritizeSections(sections, priorities);

  // Build output within limit
  let output = '';
  let usedTokens = 0;

  for (const section of prioritized) {
    const sectionTokens = countTokens(section.content);
    if (usedTokens + sectionTokens <= limit) {
      output += section.content + '\n\n';
      usedTokens += sectionTokens;
    }
  }

  return { text: output.trim(), truncated: true };
}
```

### Cache Implementation

File-based cache with TTL support:

```typescript
// src/core/cache.ts
import { mkdir, readFile, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class FileCache {
  constructor(
    private dir: string,
    private defaultTtl: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ) {}

  private getKey(input: string): string {
    return createHash('sha256').update(input).digest('hex').slice(0, 16);
  }

  private getPath(key: string): string {
    return join(this.dir, `${key}.json`);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const path = this.getPath(this.getKey(key));
      const content = await readFile(path, 'utf-8');
      const entry: CacheEntry<T> = JSON.parse(content);

      // Check TTL
      if (Date.now() - entry.timestamp > entry.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    await mkdir(this.dir, { recursive: true });

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
    };

    const path = this.getPath(this.getKey(key));
    await writeFile(path, JSON.stringify(entry), 'utf-8');
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.getPath(this.getKey(key)));
    } catch {
      // Ignore if doesn't exist
    }
  }

  async clear(): Promise<void> {
    try {
      const files = await readdir(this.dir);
      await Promise.all(
        files.map(file => unlink(join(this.dir, file)))
      );
    } catch {
      // Ignore if dir doesn't exist
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const files = await readdir(this.dir);
      let totalSize = 0;

      for (const file of files) {
        const stats = await stat(join(this.dir, file));
        totalSize += stats.size;
      }

      return {
        entries: files.length,
        size: totalSize,
        dir: this.dir,
      };
    } catch {
      return { entries: 0, size: 0, dir: this.dir };
    }
  }
}
```

### AI Provider Abstraction

Common interface for all AI providers:

```typescript
// src/plugins/optional/ai-base.ts

export interface AIProvider {
  name: string;
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
  isAvailable(): boolean;
}

export interface CompletionOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

// Claude implementation
export class ClaudeProvider implements AIProvider {
  name = 'claude';

  constructor(
    private apiKey: string,
    private model: string = 'claude-sonnet-4-20250514'
  ) {}

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async complete(prompt: string, options?: CompletionOptions): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options?.maxTokens ?? 4096,
        messages: [{ role: 'user', content: prompt }],
        system: options?.systemPrompt,
      }),
    });

    if (!response.ok) {
      throw new AIError(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}

// Similar implementations for OpenAI, Gemini, Ollama, Groq...
```

### Output Generation

Generate different output formats:

```typescript
// src/outputs/llms.ts

export function generateLlmsTxt(
  context: ExtractorContext,
  tokenLimit: number = 2000
): string {
  const { package: pkg, api, readme } = context;

  const sections: string[] = [];

  // Header
  sections.push(`# ${pkg.name}\n`);
  if (pkg.description) {
    sections.push(`> ${pkg.description}\n`);
  }

  // Install
  sections.push(`## Install\n\n\`\`\`bash\nnpm install ${pkg.name}\n\`\`\`\n`);

  // Quick usage from readme
  if (readme?.quickStart) {
    sections.push(`## Quick Start\n\n${readme.quickStart}\n`);
  }

  // API Summary
  sections.push('## API Summary\n');

  // Group by kind
  const functions = api.filter(e => e.kind === 'function');
  const classes = api.filter(e => e.kind === 'class');
  const types = api.filter(e => e.kind === 'interface' || e.kind === 'type');

  if (functions.length > 0) {
    sections.push('### Functions\n');
    for (const fn of functions.slice(0, 10)) { // Limit for token budget
      sections.push(`- \`${fn.name}()\` - ${fn.description || 'No description'}`);
    }
    sections.push('');
  }

  // Assemble and truncate
  let output = sections.join('\n');
  const { text, truncated } = truncateToTokenLimit(output, tokenLimit);

  context.truncated = truncated;
  context.tokenCount = countTokens(text);

  return text;
}
```

---

## Plugin System Implementation

### Plugin Registry

```typescript
// src/kernel.ts

export class Kernel<TContext = ExtractorContext> {
  private plugins = new Map<string, Plugin<TContext>>();
  private eventHandlers = new Map<string, Set<Function>>();

  /**
   * Register a plugin
   */
  use(plugin: Plugin<TContext>): this {
    // Validate
    if (this.plugins.has(plugin.name)) {
      throw new PluginError(`Plugin "${plugin.name}" already registered`);
    }

    // Check dependencies
    for (const dep of plugin.dependencies ?? []) {
      if (!this.plugins.has(dep)) {
        throw new PluginError(
          `Plugin "${plugin.name}" depends on "${dep}" which is not registered`
        );
      }
    }

    // Install
    plugin.install(this);
    this.plugins.set(plugin.name, plugin);

    return this;
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): boolean {
    const plugin = this.plugins.get(name);
    if (!plugin) return false;

    // Check if other plugins depend on this
    for (const [, p] of this.plugins) {
      if (p.dependencies?.includes(name)) {
        throw new PluginError(
          `Cannot unregister "${name}": "${p.name}" depends on it`
        );
      }
    }

    // Destroy
    plugin.onDestroy?.();
    this.plugins.delete(name);

    return true;
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Emit an event
   */
  async emit(event: string, ...args: unknown[]): Promise<void> {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    for (const handler of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        // Find which plugin owns this handler and call onError
        this.handlePluginError(error as Error);
      }
    }
  }

  /**
   * List all plugins
   */
  listPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      category: p.category,
      dependencies: p.dependencies ?? [],
    }));
  }
}
```

### Core Plugin Example

```typescript
// src/plugins/core/dts-parser.ts

export const dtsParserPlugin: Plugin = {
  name: 'dts-parser',
  version: '1.0.0',
  category: 'parser',

  install(kernel) {
    kernel.on('parse:start', async (context: ExtractorContext) => {
      // Find .d.ts files
      const dtsFiles = Array.from(context.package.files.entries())
        .filter(([path]) => path.endsWith('.d.ts'))
        .sort(([a], [b]) => {
          // Prioritize index.d.ts
          if (a.includes('index.d.ts')) return -1;
          if (b.includes('index.d.ts')) return 1;
          return a.localeCompare(b);
        });

      for (const [path, content] of dtsFiles) {
        const result = parseDts(content);
        context.api.push(...result.exports);
      }
    });
  },
};
```

---

## Error Handling Strategy

### Error Classes

```typescript
// src/errors.ts

export class NpmLlmsError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NpmLlmsError';
  }
}

export class PackageNotFoundError extends NpmLlmsError {
  constructor(packageName: string) {
    super(
      `Package "${packageName}" not found on npm`,
      'PACKAGE_NOT_FOUND',
      { packageName }
    );
  }
}

export class VersionNotFoundError extends NpmLlmsError {
  constructor(packageName: string, version: string) {
    super(
      `Version "${version}" not found for package "${packageName}"`,
      'VERSION_NOT_FOUND',
      { packageName, version }
    );
  }
}

export class DownloadError extends NpmLlmsError {
  constructor(message: string, url?: string) {
    super(message, 'DOWNLOAD_FAILED', { url });
  }
}

export class ParseError extends NpmLlmsError {
  constructor(message: string, file?: string) {
    super(message, 'PARSE_ERROR', { file });
  }
}

export class AIError extends NpmLlmsError {
  constructor(message: string, provider?: string) {
    super(message, 'AI_ERROR', { provider });
  }
}

export class PluginError extends NpmLlmsError {
  constructor(message: string, pluginName?: string) {
    super(message, 'PLUGIN_ERROR', { pluginName });
  }
}

export class CacheError extends NpmLlmsError {
  constructor(message: string) {
    super(message, 'CACHE_ERROR');
  }
}

export class ConfigError extends NpmLlmsError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
}
```

### Error Boundary in Kernel

```typescript
// In kernel.ts

private handlePluginError(error: Error): void {
  // Log error
  console.error(`[npm-llms] Plugin error:`, error);

  // Find plugin that threw (if we track handlers)
  // Call plugin.onError if available

  // Don't rethrow - allow other plugins to continue
}
```

---

## Testing Strategy

### Unit Tests

Test each component in isolation:

```typescript
// tests/unit/parsers/dts.test.ts
import { describe, it, expect } from 'vitest';
import { parseDts } from '../../../src/parsers/dts';

describe('DTS Parser', () => {
  it('should parse exported function', () => {
    const content = `
      export declare function greet(name: string): string;
    `;
    const result = parseDts(content);
    expect(result.exports).toHaveLength(1);
    expect(result.exports[0]).toMatchObject({
      kind: 'function',
      name: 'greet',
    });
  });

  it('should extract JSDoc description', () => {
    const content = `
      /**
       * Greets a person by name.
       * @param name - The person's name
       * @returns A greeting message
       */
      export declare function greet(name: string): string;
    `;
    const result = parseDts(content);
    expect(result.exports[0].description).toBe('Greets a person by name.');
  });
});
```

### Integration Tests

Test full extraction flow:

```typescript
// tests/integration/extract.test.ts
import { describe, it, expect } from 'vitest';
import { createExtractor } from '../../src';

describe('Extractor Integration', () => {
  it('should extract lodash documentation', async () => {
    const extractor = createExtractor();
    const result = await extractor.extract('lodash@4.17.21');

    expect(result.package.name).toBe('lodash');
    expect(result.package.version).toBe('4.17.21');
    expect(result.api.length).toBeGreaterThan(0);
    expect(result.outputs.llms).toBeDefined();
  }, 30000); // Longer timeout for network
});
```

### Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
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

## Build Configuration

### tsup Configuration

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/plugins/index.ts',
    'src/cli/index.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  banner: {
    js: (ctx) => {
      if (ctx.options.entry?.some(e => e.includes('cli'))) {
        return '#!/usr/bin/env node';
      }
      return '';
    },
  },
});
```

---

## Performance Optimizations

1. **Lazy Plugin Loading**: AI plugins only loaded when needed
2. **Streaming Tar Extraction**: Process files as they're extracted
3. **Parallel File Parsing**: Parse multiple files concurrently
4. **Cache Everything**: Package metadata, tarballs, AI responses
5. **Token Budget**: Pre-calculate token estimates to avoid truncation loops

---

## Security Measures

1. **Path Traversal Prevention**:
   ```typescript
   function sanitizePath(path: string): string {
     // Normalize and check for directory traversal
     const normalized = path.replace(/\\/g, '/');
     if (normalized.includes('..') || normalized.startsWith('/')) {
       throw new Error('Invalid path');
     }
     return normalized;
   }
   ```

2. **Package Name Validation**:
   ```typescript
   function validatePackageName(name: string): void {
     const valid = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
     if (!valid.test(name)) {
       throw new ConfigError(`Invalid package name: ${name}`);
     }
   }
   ```

3. **No Code Execution**: All parsing done with regex/state machines, never eval
