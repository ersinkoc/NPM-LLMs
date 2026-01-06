/**
 * Custom output plugin example
 *
 * This example shows how to create a custom output format plugin
 * that generates documentation in a specific format.
 *
 * Run with: npx tsx examples/04-plugins/custom-output.ts
 */

import { createExtractor, definePlugin } from '../../src/index.js';
import type { Plugin, ExtractorContext, Kernel, APIEntry } from '../../src/types.js';

/**
 * Generate documentation in Cursor/Copilot rules format
 *
 * This format is optimized for AI coding assistants
 */
function generateCursorRules(ctx: ExtractorContext): string {
  const lines: string[] = [];
  const pkg = ctx.package;

  // Header
  lines.push(`# ${pkg.name} API Reference`);
  lines.push('');
  lines.push(`You are using ${pkg.name}@${pkg.version}.`);
  if (pkg.description) {
    lines.push(pkg.description);
  }
  lines.push('');

  // Usage rules
  lines.push('## Usage Rules');
  lines.push('');
  lines.push(`When working with ${pkg.name}:`);
  lines.push('');

  // Extract import info
  const hasDefaultExport = ctx.api.some((e) => e.isDefault);
  const namedExports = ctx.api.filter((e) => !e.isDefault);

  if (hasDefaultExport) {
    lines.push(`- Import default: \`import ${pkg.name} from '${pkg.name}'\``);
  }

  if (namedExports.length > 0) {
    const names = namedExports.slice(0, 5).map((e) => e.name).join(', ');
    lines.push(`- Import named: \`import { ${names} } from '${pkg.name}'\``);
  }

  lines.push('');

  // Function signatures (most useful for AI)
  const functions = ctx.api.filter((e) => e.kind === 'function');
  if (functions.length > 0) {
    lines.push('## Functions');
    lines.push('');

    for (const fn of functions) {
      lines.push(`### ${fn.name}`);
      lines.push('');
      lines.push('```typescript');
      lines.push(fn.signature);
      lines.push('```');
      lines.push('');

      if (fn.description) {
        lines.push(fn.description);
        lines.push('');
      }

      if (fn.params && fn.params.length > 0) {
        lines.push('Parameters:');
        for (const p of fn.params) {
          const opt = p.optional ? '?' : '';
          const type = p.type ? `: ${p.type}` : '';
          const desc = p.description ? ` - ${p.description}` : '';
          lines.push(`- \`${p.name}${opt}${type}\`${desc}`);
        }
        lines.push('');
      }

      if (fn.examples && fn.examples.length > 0) {
        lines.push('Example:');
        lines.push('```typescript');
        lines.push(fn.examples[0]!);
        lines.push('```');
        lines.push('');
      }
    }
  }

  // Types (helpful for AI to understand structures)
  const types = ctx.api.filter((e) => e.kind === 'type' || e.kind === 'interface');
  if (types.length > 0) {
    lines.push('## Types');
    lines.push('');

    for (const t of types) {
      lines.push(`### ${t.name}`);
      lines.push('');
      lines.push('```typescript');
      lines.push(t.signature);
      lines.push('```');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Create a plugin that outputs Cursor-compatible rules format
 */
function createCursorOutputPlugin(): Plugin {
  return definePlugin({
    name: 'cursor-output',
    version: '1.0.0',
    category: 'output',

    install(kernel: Kernel<ExtractorContext>) {
      kernel.on('output:generate', async (ctx: ExtractorContext) => {
        // Generate our custom format
        const cursorRules = generateCursorRules(ctx);

        // Store it with a custom key
        // Note: We use 'cursor' but it won't appear unless formats includes it
        ctx.outputs.set('cursor' as 'llms', cursorRules);
      });
    },
  });
}

/**
 * Generate YAML documentation format
 */
function generateYAML(ctx: ExtractorContext): string {
  const lines: string[] = [];

  lines.push(`name: ${ctx.package.name}`);
  lines.push(`version: ${ctx.package.version}`);
  if (ctx.package.description) {
    lines.push(`description: ${ctx.package.description}`);
  }
  lines.push('');
  lines.push('api:');

  for (const entry of ctx.api) {
    lines.push(`  - name: ${entry.name}`);
    lines.push(`    kind: ${entry.kind}`);
    if (entry.description) {
      // Escape and format for YAML
      const desc = entry.description.replace(/"/g, '\\"');
      lines.push(`    description: "${desc}"`);
    }
    if (entry.params && entry.params.length > 0) {
      lines.push('    params:');
      for (const p of entry.params) {
        lines.push(`      - name: ${p.name}`);
        if (p.type) lines.push(`        type: ${p.type}`);
        if (p.optional) lines.push(`        optional: true`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Create a YAML output plugin
 */
function createYAMLOutputPlugin(): Plugin {
  return definePlugin({
    name: 'yaml-output',
    version: '1.0.0',
    category: 'output',

    install(kernel: Kernel<ExtractorContext>) {
      kernel.on('output:generate', async (ctx: ExtractorContext) => {
        const yaml = generateYAML(ctx);
        ctx.outputs.set('yaml' as 'llms', yaml);
      });
    },
  });
}

async function main() {
  const extractor = createExtractor({
    verbose: true,
  });

  // Register custom output plugins
  extractor.use(createCursorOutputPlugin());
  extractor.use(createYAMLOutputPlugin());

  console.log('Extracting with custom output formats...\n');

  const result = await extractor.extract('ms', {
    formats: ['llms'],
    llmsTokenLimit: 2000,
  });

  // The custom outputs are accessible even if not in formats array
  console.log('=== Cursor Rules Format ===\n');
  console.log(result.outputs['cursor']);

  console.log('\n=== YAML Format ===\n');
  console.log(result.outputs['yaml']);

  console.log('\n=== Standard llms.txt ===\n');
  console.log(result.outputs['llms']?.slice(0, 500) + '...');
}

main().catch(console.error);
