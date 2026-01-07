# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-07

### Added

- **Core Features**
  - Zero-dependency NPM package documentation extractor
  - llms.txt generation with smart token truncation
  - llms-full.txt complete API documentation
  - Markdown and JSON output formats
  - TypeScript (.d.ts) parsing support
  - README.md parsing with example extraction
  - Built-in file-based caching with TTL

- **CLI**
  - `npm-llms extract <package>` command
  - Multiple output format flags (`--llms`, `--llms-full`, `--markdown`, `--json`, `--all`)
  - Output directory support (`-o, --output`)
  - Stdout output (`--stdout`)
  - Cache management (`cache-clear` command)
  - Verbose mode (`-v, --verbose`)

- **Plugin System**
  - Micro-kernel architecture
  - Event-based plugin hooks
  - Core plugins for parsing and output generation
  - `definePlugin` helper for creating plugins

- **AI Enrichment Plugins**
  - Claude AI plugin (claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5)
  - OpenAI plugin (gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, o3, o1)
  - Gemini plugin (gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash)
  - Groq plugin (llama-3.3-70b-versatile, llama-4-maverick, llama-4-scout)
  - Ollama plugin (local model support)

- **OpenAI-Compatible Providers**
  - x.ai (Grok) support
  - z.ai (GLM) support
  - Together AI support
  - Perplexity support
  - OpenRouter support
  - DeepSeek support
  - Mistral support
  - Custom endpoint support

- **Error Handling**
  - Typed error classes with error codes
  - `isNpmLlmsError` type guard
  - Comprehensive error messages

- **Developer Experience**
  - Full TypeScript support
  - ESM and CommonJS exports
  - Comprehensive test suite (384 tests)
  - 100% test coverage for AI plugins

### Technical Details

- Node.js 18+ required
- Zero runtime dependencies
- AI plugins are optional and tree-shakeable

[1.0.0]: https://github.com/ersinkoc/npm-llms/releases/tag/v1.0.0
