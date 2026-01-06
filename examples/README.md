# Examples

This directory contains example scripts demonstrating how to use `@oxog/npm-llms`.

## Prerequisites

Make sure you have built the project first:

```bash
npm run build
```

## Running Examples

All TypeScript examples can be run using `npx tsx`:

```bash
npx tsx examples/01-basic/minimal.ts
```

## Example Categories

### 01-basic

Basic usage examples:

- [minimal.ts](01-basic/minimal.ts) - Simplest possible usage
- [with-options.ts](01-basic/with-options.ts) - Using all available options

```bash
npx tsx examples/01-basic/minimal.ts
npx tsx examples/01-basic/with-options.ts
```

### 02-formats

Output format examples:

- [llms-only.ts](02-formats/llms-only.ts) - Generate only llms.txt with custom token limit

```bash
npx tsx examples/02-formats/llms-only.ts
```

### 03-ai-enrichment

AI-powered documentation enhancement:

- [with-claude.ts](03-ai-enrichment/with-claude.ts) - Using Claude (Anthropic)
- [with-openai.ts](03-ai-enrichment/with-openai.ts) - Using OpenAI GPT
- [with-ollama.ts](03-ai-enrichment/with-ollama.ts) - Using local Ollama models

```bash
# Requires ANTHROPIC_API_KEY
npx tsx examples/03-ai-enrichment/with-claude.ts

# Requires OPENAI_API_KEY
npx tsx examples/03-ai-enrichment/with-openai.ts

# Requires Ollama running locally
npx tsx examples/03-ai-enrichment/with-ollama.ts
```

### 04-plugins

Custom plugin development:

- [custom-parser.ts](04-plugins/custom-parser.ts) - Create a custom parser plugin
- [custom-output.ts](04-plugins/custom-output.ts) - Create a custom output format

```bash
npx tsx examples/04-plugins/custom-parser.ts
npx tsx examples/04-plugins/custom-output.ts
```

### 05-cli

Command-line interface examples:

- [basic-usage.sh](05-cli/basic-usage.sh) - Basic CLI commands
- [with-ai.sh](05-cli/with-ai.sh) - CLI with AI enrichment

```bash
bash examples/05-cli/basic-usage.sh
bash examples/05-cli/with-ai.sh
```

### 06-real-world

Practical real-world use cases:

- [generate-for-cursor/](06-real-world/generate-for-cursor/) - Generate docs for Cursor/Copilot
- [batch-extraction/](06-real-world/batch-extraction/) - Batch process multiple packages

```bash
npx tsx examples/06-real-world/generate-for-cursor/index.ts
npx tsx examples/06-real-world/batch-extraction/index.ts
```

## Using the CLI

You can also use the CLI directly:

```bash
# Basic usage
npm-llms extract lodash

# With options
npm-llms extract zod@3.22.0 --llms -o ./docs

# All formats
npm-llms extract express --all -o ./output

# Print to stdout
npm-llms extract ms --llms --stdout

# With AI enrichment
npm-llms extract lodash --llms --ai claude
```

## Quick Reference

| Example | Description | Requirements |
|---------|-------------|--------------|
| 01-basic | Core API usage | None |
| 02-formats | Output formats | None |
| 03-ai | AI enrichment | API key or Ollama |
| 04-plugins | Custom plugins | None |
| 05-cli | CLI usage | Built project |
| 06-real-world | Production patterns | None |
