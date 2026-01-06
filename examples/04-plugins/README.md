# Plugin Examples

These examples demonstrate how to extend `@oxog/npm-llms` with custom plugins.

## Plugin Categories

| Category | Purpose | Events |
|----------|---------|--------|
| `parser` | Extract data from packages | `parse:*` |
| `output` | Generate custom formats | `output:generate` |
| `ai` | AI enrichment | `ai:*` |
| `utility` | Helper functionality | Various |

## Running Examples

```bash
# Custom parser plugin
npx tsx examples/04-plugins/custom-parser.ts

# Custom output plugin
npx tsx examples/04-plugins/custom-output.ts
```

## Creating a Plugin

### Basic Structure

```typescript
import { definePlugin } from '@oxog/npm-llms';

const myPlugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  category: 'parser',
  dependencies: [], // Optional: other plugins this depends on

  install(kernel) {
    // Subscribe to events
    kernel.on('parse:complete', async (ctx) => {
      // Access package files
      const readme = ctx.package.files.get('package/README.md');

      // Modify API entries
      ctx.api.push({
        kind: 'function',
        name: 'myFunction',
        signature: 'function myFunction(): void',
      });
    });
  },

  onInit(ctx) {
    // Called after all plugins are installed
  },

  onDestroy() {
    // Cleanup when plugin is unregistered
  },
});
```

### Using the Plugin

```typescript
import { createExtractor } from '@oxog/npm-llms';

const extractor = createExtractor();
extractor.use(myPlugin);

const result = await extractor.extract('lodash');
```

## Available Events

### Parse Phase

- `parse:start` - Before parsing begins
- `parse:readme` - README parsing
- `parse:dts` - TypeScript definitions parsing
- `parse:source` - Source file parsing
- `parse:changelog` - Changelog parsing
- `parse:complete` - After all parsing is done

### Output Phase

- `output:start` - Before output generation
- `output:generate` - Generate outputs
- `output:complete` - After outputs are generated

### AI Phase

- `ai:enrich` - AI enrichment step

## Context Object

The context (`ctx`) passed to event handlers contains:

```typescript
interface ExtractorContext {
  package: PackageInfo;      // Package metadata + files
  api: APIEntry[];           // Parsed API entries
  readme?: ParsedReadme;     // Parsed README
  changelog?: ParsedChangelog;
  options: ExtractOptions;   // User options
  outputs: Map<string, string>; // Generated outputs
  tokenCount: number;
  truncated: boolean;
  errors: Error[];
}
```

## Plugin Composition

Combine multiple plugins:

```typescript
import { composePlugins } from '@oxog/npm-llms';

const combinedPlugin = composePlugins(
  pluginA,
  pluginB,
  pluginC
);

extractor.use(combinedPlugin);
```

## Best Practices

1. **Name your plugin uniquely** - Use `your-org-feature` format
2. **Declare dependencies** - If your plugin needs another, list it
3. **Handle errors gracefully** - Don't let errors crash the extraction
4. **Clean up in onDestroy** - Release resources when unregistered
5. **Keep plugins focused** - One plugin, one responsibility
