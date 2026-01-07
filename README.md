# @oxog/npm-llms

Extract LLM-optimized documentation (llms.txt, llms-full.txt) from any NPM package with optional AI enrichment.

[![npm version](https://img.shields.io/npm/v/@oxog/npm-llms.svg)](https://www.npmjs.com/package/@oxog/npm-llms)
[![license](https://img.shields.io/npm/l/@oxog/npm-llms.svg)](https://github.com/ersinkoc/npm-llms/blob/main/LICENSE)

## Features

- **Zero Runtime Dependencies** - Uses only Node.js built-in modules
- **llms.txt Generation** - Token-optimized documentation for AI assistants
- **Multiple Output Formats** - llms.txt, llms-full.txt, Markdown, JSON
- **TypeScript Support** - Parses .d.ts files and TypeScript source
- **Smart Truncation** - Prioritizes important content within token limits
- **Plugin Architecture** - Extensible micro-kernel design
- **Built-in Caching** - File-based cache with TTL support
- **CLI Included** - Command-line interface for quick extraction
- **AI Enrichment** - Optional AI-powered documentation enhancement

## AI Providers

Enhance documentation with AI-generated descriptions and examples:

| Provider | Model Examples |
|----------|----------------|
| **OpenAI** | gpt-4.1, gpt-4.1-nano, o3, o1 |
| **Claude** | claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5 |
| **Gemini** | gemini-3-flash-preview, gemini-2.5-pro |
| **Groq** | llama-3.3-70b-versatile, llama-4-maverick |
| **Ollama** | Any local model |
| **OpenAI-Compatible** | x.ai, DeepSeek, Mistral, Together, Perplexity, OpenRouter |

## Installation

```bash
npm install @oxog/npm-llms
```

## Quick Start

### Programmatic API

```typescript
import { createExtractor, extract } from '@oxog/npm-llms';

// Simple one-liner
const result = await extract('zod');
console.log(result.outputs['llms']);

// With full configuration
const extractor = createExtractor({
  cache: {
    enabled: true,
    dir: '.npm-llms-cache',
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  verbose: true,
});

const result = await extractor.extract('lodash@4.17.21', {
  formats: ['llms', 'llms-full', 'markdown', 'json'],
  llmsTokenLimit: 2000,
  prioritize: ['functions', 'examples'],
});

console.log(`Package: ${result.package.name}@${result.package.version}`);
console.log(`API entries: ${result.api.length}`);
console.log(`Token count: ${result.tokenCount}`);
```

### CLI

```bash
# Extract llms.txt
npm-llms extract zod --llms

# Extract all formats to a directory
npm-llms extract lodash --all -o ./docs

# Print to stdout
npm-llms extract express --llms --stdout

# Extract specific version
npm-llms extract zod@3.22.0 --json

# Clear cache
npm-llms cache-clear

# Show help
npm-llms --help
```

## AI Enrichment

Enhance extracted documentation with AI-generated content:

```typescript
import { createExtractor } from '@oxog/npm-llms';
import { createClaudePlugin } from '@oxog/npm-llms/plugins';

const extractor = createExtractor();

// Use Claude for AI enrichment
extractor.use(createClaudePlugin({
  model: 'claude-haiku-4-5',
  // apiKey: 'sk-...' // or set ANTHROPIC_API_KEY env var
}));

const result = await extractor.extract('zod');
```

### Using OpenAI-Compatible Providers

```typescript
import {
  createOpenAIProvider,
  createXAIProvider,
  createDeepSeekProvider,
  createMistralProvider,
} from '@oxog/npm-llms/plugins';

// x.ai (Grok)
const xai = createXAIProvider({ model: 'grok-3-mini-fast' });

// DeepSeek
const deepseek = createDeepSeekProvider({ model: 'deepseek-chat' });

// Mistral
const mistral = createMistralProvider({ model: 'mistral-small-latest' });

// Any OpenAI-compatible endpoint
const custom = createOpenAIProvider({
  baseUrl: 'https://my-api.example.com/v1',
  apiKey: 'my-key',
  model: 'my-model',
});
```

## Output Formats

### llms.txt

Token-limited (default 2000 tokens) summary optimized for AI assistants:
- Package description
- Installation instructions
- Quick start examples
- API summary (functions, classes, types)

### llms-full.txt

Complete API documentation:
- All exported functions with full signatures
- All parameters and return types
- All examples from JSDoc
- Class methods and properties

### Markdown (API.md)

Human-readable documentation:
- Table of contents
- Parameter tables
- Code examples with syntax highlighting
- Type definitions

### JSON (api.json)

Structured JSON output for programmatic use:
- Full API metadata
- Package information
- All type definitions

## API Reference

### createExtractor(options?)

Creates an extractor instance with optional configuration.

```typescript
const extractor = createExtractor({
  cache: {
    enabled: true,      // Enable caching (default: true)
    dir: '.cache',      // Cache directory
    ttl: 604800000,     // TTL in ms (default: 7 days)
  },
  registry: 'https://registry.npmjs.org',
  verbose: false,
});
```

### extractor.extract(packageSpec, options?)

Extracts documentation from a package.

```typescript
const result = await extractor.extract('package-name@version', {
  formats: ['llms', 'llms-full', 'markdown', 'json'],
  llmsTokenLimit: 2000,
  prioritize: ['functions', 'examples'],
  ignoreCache: false,
});
```

### extract(packageSpec, options?)

Convenience function that creates a temporary extractor.

```typescript
const result = await extract('zod', { formats: ['llms'] });
```

## Plugin System

The extractor uses a micro-kernel architecture with plugins for parsing and output generation.

### Creating a Plugin

```typescript
import { definePlugin } from '@oxog/npm-llms';

const myPlugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  category: 'output',

  install(kernel) {
    kernel.on('output:generate', async (context) => {
      context.outputs.set('custom', myCustomOutput);
    });
  },
});

const extractor = createExtractor();
extractor.use(myPlugin);
```

### Available Events

- `parse:dts` - After parsing .d.ts files
- `parse:typescript` - After parsing TypeScript source
- `parse:readme` - After parsing README
- `output:generate` - When generating outputs
- `output:llms` - Before generating llms.txt
- `output:llms-full` - Before generating llms-full.txt
- `output:markdown` - Before generating markdown
- `output:json` - Before generating JSON

## Error Handling

All errors extend `NpmLlmsError` with a `code` property:

```typescript
import { extract, isNpmLlmsError } from '@oxog/npm-llms';

try {
  await extract('nonexistent-package-12345');
} catch (error) {
  if (isNpmLlmsError(error)) {
    console.log(error.code); // 'PKG_NOT_FOUND'
    console.log(error.message);
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `PKG_NOT_FOUND` | Package doesn't exist on NPM |
| `VERSION_NOT_FOUND` | Specified version doesn't exist |
| `DOWNLOAD_FAILED` | Failed to download package tarball |
| `PARSE_ERROR` | Failed to parse source files |
| `CACHE_ERROR` | Cache read/write error |
| `CONFIG_ERROR` | Invalid configuration |
| `PLUGIN_ERROR` | Plugin error |
| `TAR_ERROR` | Tar extraction error |
| `TIMEOUT` | Operation timed out |
| `VALIDATION_ERROR` | Invalid input |

## Requirements

- Node.js 18+
- No runtime dependencies (AI plugins are optional)

## License

MIT
