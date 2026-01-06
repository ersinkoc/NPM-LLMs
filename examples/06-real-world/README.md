# Real-World Examples

Practical examples showing how to use `@oxog/npm-llms` in real projects.

## Examples

### 1. Generate for Cursor/Copilot

Generate `llms.txt` files for all your project dependencies that AI coding assistants can reference.

```bash
cd examples/06-real-world/generate-for-cursor
npx tsx index.ts /path/to/your/project/package.json
```

This creates a `.llms/` directory with documentation for each dependency:

```
.llms/
├── index.md           # Index of all docs
├── lodash.txt         # lodash documentation
├── zod.txt            # zod documentation
├── @types__node.txt   # Scoped packages use __
└── ...
```

**Use case:** Add to your project and reference in `.cursorrules`:
```
For API documentation, refer to files in the .llms/ directory.
```

### 2. Batch Extraction

Extract documentation for multiple packages in parallel with progress tracking and reporting.

```bash
cd examples/06-real-world/batch-extraction
npx tsx index.ts
```

Features:
- Parallel processing (configurable concurrency)
- Progress tracking
- Error handling and retry
- Markdown report generation

Output:
```
batch-output/
├── report.md          # Summary report
├── lodash/
│   ├── llms.txt
│   ├── llms-full.txt
│   └── api.json
├── zod/
│   └── ...
└── ...
```

## Integration Ideas

### CI/CD Pipeline

```yaml
# .github/workflows/docs.yml
name: Generate API Docs

on:
  push:
    branches: [main]
    paths:
      - 'package.json'

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate llms.txt for dependencies
        run: |
          npx @oxog/npm-llms extract $(jq -r '.dependencies | keys[]' package.json) --llms -o .llms

      - name: Commit changes
        uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: 'docs: update dependency documentation'
          file_pattern: '.llms/*'
```

### Pre-commit Hook

```bash
#!/bin/bash
# .husky/pre-commit

# Regenerate docs if package.json changed
if git diff --cached --name-only | grep -q "package.json"; then
  npx tsx scripts/generate-dep-docs.ts
  git add .llms/
fi
```

### VS Code Task

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Generate API Docs",
      "type": "shell",
      "command": "npx @oxog/npm-llms extract ${input:packageName} --all -o ./docs",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "packageName",
      "type": "promptString",
      "description": "Package name to document"
    }
  ]
}
```

### MCP Server Integration

Use with Claude Desktop or other MCP-compatible tools:

```typescript
// mcp-server.ts
import { createExtractor } from '@oxog/npm-llms';

const extractor = createExtractor();

// Tool: get_package_docs
async function getPackageDocs(name: string): Promise<string> {
  const result = await extractor.extract(name, {
    formats: ['llms'],
    llmsTokenLimit: 2000,
  });
  return result.outputs['llms'] || '';
}
```

## Best Practices

1. **Cache aggressively** - Package docs don't change often
2. **Use token limits** - Keep `llms.txt` files small for context windows
3. **Prioritize** - Focus on functions and examples over types
4. **Version pin** - Extract for specific versions in production
5. **Batch wisely** - Don't overwhelm npm registry with requests
