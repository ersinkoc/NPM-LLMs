/**
 * Custom parser plugin example
 *
 * This example shows how to create a custom parser plugin
 * that extracts additional metadata from packages.
 *
 * Run with: npx tsx examples/04-plugins/custom-parser.ts
 */

import { createExtractor, definePlugin } from '../../src/index.js';
import type { Plugin, ExtractorContext, Kernel } from '../../src/types.js';

/**
 * Custom metadata we want to extract
 */
interface CustomMetadata {
  hasTests: boolean;
  testFramework?: string;
  hasPrettier: boolean;
  hasEslint: boolean;
  nodeVersion?: string;
  scripts: string[];
}

// Extend context to include our custom data
declare module '../../src/types.js' {
  interface ExtractorContext {
    customMeta?: CustomMetadata;
  }
}

/**
 * Create a plugin that extracts build tooling metadata
 */
function createToolingParserPlugin(): Plugin {
  return definePlugin({
    name: 'tooling-parser',
    version: '1.0.0',
    category: 'parser',

    install(kernel: Kernel<ExtractorContext>) {
      // Listen for the parse phase
      kernel.on('parse:complete', async (ctx: ExtractorContext) => {
        const meta: CustomMetadata = {
          hasTests: false,
          hasPrettier: false,
          hasEslint: false,
          scripts: [],
        };

        // Look for package.json to extract metadata
        const pkgJson = ctx.package.files.get('package/package.json');
        if (pkgJson) {
          try {
            const pkg = JSON.parse(pkgJson) as Record<string, unknown>;

            // Check for test frameworks
            const devDeps = (pkg['devDependencies'] || {}) as Record<string, string>;
            const deps = (pkg['dependencies'] || {}) as Record<string, string>;
            const allDeps = { ...devDeps, ...deps };

            if ('jest' in allDeps) {
              meta.hasTests = true;
              meta.testFramework = 'jest';
            } else if ('mocha' in allDeps) {
              meta.hasTests = true;
              meta.testFramework = 'mocha';
            } else if ('vitest' in allDeps) {
              meta.hasTests = true;
              meta.testFramework = 'vitest';
            } else if ('ava' in allDeps) {
              meta.hasTests = true;
              meta.testFramework = 'ava';
            }

            // Check for linting/formatting
            meta.hasPrettier = 'prettier' in allDeps;
            meta.hasEslint = 'eslint' in allDeps;

            // Extract scripts
            const scripts = pkg['scripts'] as Record<string, string> | undefined;
            if (scripts) {
              meta.scripts = Object.keys(scripts);
            }

            // Check node version requirement
            const engines = pkg['engines'] as Record<string, string> | undefined;
            if (engines?.['node']) {
              meta.nodeVersion = engines['node'];
            }
          } catch {
            // Ignore JSON parse errors
          }
        }

        // Store in context
        ctx.customMeta = meta;
      });
    },
  });
}

/**
 * Create a plugin that adds custom data to outputs
 */
function createToolingOutputPlugin(): Plugin {
  return definePlugin({
    name: 'tooling-output',
    version: '1.0.0',
    category: 'output',
    dependencies: ['tooling-parser'],

    install(kernel: Kernel<ExtractorContext>) {
      kernel.on('output:generate', async (ctx: ExtractorContext) => {
        if (!ctx.customMeta) return;

        const meta = ctx.customMeta;
        const lines: string[] = [
          '',
          '## Development Info',
          '',
        ];

        if (meta.hasTests) {
          lines.push(`- Test Framework: ${meta.testFramework}`);
        }

        if (meta.hasEslint) {
          lines.push('- Linting: ESLint');
        }

        if (meta.hasPrettier) {
          lines.push('- Formatting: Prettier');
        }

        if (meta.nodeVersion) {
          lines.push(`- Node.js: ${meta.nodeVersion}`);
        }

        if (meta.scripts.length > 0) {
          lines.push(`- Scripts: ${meta.scripts.join(', ')}`);
        }

        // Append to llms output if it exists
        const llmsOutput = ctx.outputs.get('llms');
        if (llmsOutput) {
          ctx.outputs.set('llms', llmsOutput + lines.join('\n'));
        }
      });
    },
  });
}

async function main() {
  const extractor = createExtractor({
    verbose: true,
  });

  // Register our custom plugins
  extractor.use(createToolingParserPlugin());
  extractor.use(createToolingOutputPlugin());

  console.log('Extracting with custom plugins...\n');

  const result = await extractor.extract('zod', {
    formats: ['llms'],
    llmsTokenLimit: 1000,
  });

  console.log('=== Package ===');
  console.log(`${result.package.name}@${result.package.version}`);

  console.log('\n=== llms.txt with custom section ===');
  console.log(result.outputs['llms']);

  console.log('\n=== Registered Plugins ===');
  for (const plugin of extractor.listPlugins()) {
    console.log(`- ${plugin.name} (${plugin.category})`);
  }
}

main().catch(console.error);
