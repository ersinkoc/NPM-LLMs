# CLI Examples

Command-line interface examples for `@oxog/npm-llms`.

## Prerequisites

Build the project first:

```bash
npm run build
```

## Basic Commands

### Extract Documentation

```bash
# Default: generates llms.txt
npm-llms extract lodash

# Specific format
npm-llms extract lodash --llms
npm-llms extract lodash --markdown
npm-llms extract lodash --json
npm-llms extract lodash --all

# Specific version
npm-llms extract zod@3.22.0 --llms

# Scoped packages
npm-llms extract @anthropic-ai/sdk --llms
```

### Output Options

```bash
# Output to directory (default: ./npm-llms-output)
npm-llms extract lodash --all -o ./docs

# Print to stdout (for piping)
npm-llms extract ms --llms --stdout

# JSON output to stdout
npm-llms extract chalk --json --stdout | jq '.api | length'
```

### Token Limit

```bash
# Custom token limit for llms.txt (default: 2000)
npm-llms extract express --llms --tokens 1500

# Very small output
npm-llms extract lodash --llms --tokens 500
```

### Cache Management

```bash
# Clear all cached packages
npm-llms cache-clear

# Force fresh extraction (ignore cache)
npm-llms extract lodash --llms --no-cache
```

## AI Enrichment

### With API Keys

```bash
# Claude (Anthropic)
export ANTHROPIC_API_KEY=sk-ant-...
npm-llms extract lodash --llms --ai claude

# OpenAI
export OPENAI_API_KEY=sk-...
npm-llms extract lodash --llms --ai openai

# Gemini
export GOOGLE_API_KEY=...
npm-llms extract lodash --llms --ai gemini

# Groq (fastest)
export GROQ_API_KEY=gsk_...
npm-llms extract lodash --llms --ai groq
```

### With Local Ollama

```bash
# Start Ollama server first
ollama serve

# Then use with CLI
npm-llms extract lodash --llms --ai ollama --ai-model llama3.2
```

### Specify Model

```bash
npm-llms extract lodash --ai openai --ai-model gpt-4o
npm-llms extract lodash --ai claude --ai-model claude-3-opus-20240229
```

## Scripting Examples

### Batch Processing

```bash
#!/bin/bash
# Extract docs for multiple packages

packages=("lodash" "zod" "express" "react")

for pkg in "${packages[@]}"; do
  echo "Extracting $pkg..."
  npm-llms extract "$pkg" --llms -o "./docs/$pkg"
done
```

### Pipeline Integration

```bash
# Generate and copy to clipboard (macOS)
npm-llms extract ms --llms --stdout | pbcopy

# Count API entries
npm-llms extract lodash --json --stdout | jq '.api | length'

# Extract just function names
npm-llms extract lodash --json --stdout | jq '.api[] | select(.kind == "function") | .name'
```

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Generate API docs
  run: |
    npx @oxog/npm-llms extract ${{ github.event.repository.name }} --all -o ./docs

- name: Upload docs
  uses: actions/upload-artifact@v3
  with:
    name: api-docs
    path: ./docs/
```

## Common Options

| Option | Description |
|--------|-------------|
| `--llms` | Generate llms.txt |
| `--markdown` | Generate API.md |
| `--json` | Generate api.json |
| `--all` | Generate all formats |
| `-o, --output` | Output directory |
| `--stdout` | Print to stdout |
| `--tokens` | Token limit for llms.txt |
| `--ai` | AI provider (claude/openai/gemini/groq/ollama) |
| `--ai-model` | Specific AI model |
| `--no-cache` | Ignore cache |
| `-v, --verbose` | Verbose output |
| `--help` | Show help |
| `--version` | Show version |
