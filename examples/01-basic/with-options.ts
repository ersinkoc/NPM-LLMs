/**
 * Example with all options
 *
 * Run with: npx tsx examples/01-basic/with-options.ts
 */

import { createExtractor } from '../../src/index.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  // Create an extractor with custom options
  const extractor = createExtractor({
    // Configure caching
    cache: {
      enabled: true,
      dir: '.npm-llms-cache',
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    // Enable verbose logging
    verbose: true,
    // Custom npm registry (optional)
    registry: 'https://registry.npmjs.org',
  });

  // Extract documentation with specific options
  const result = await extractor.extract('zod@3.22.0', {
    // Generate multiple formats
    formats: ['llms', 'llms-full', 'markdown', 'json'],

    // Set token limit for llms.txt
    llmsTokenLimit: 2000,

    // Prioritize certain content when truncating
    prioritize: ['functions', 'examples'],

    // Force fresh extraction (ignore cache)
    ignoreCache: false,
  });

  // Create output directory
  const outputDir = './output';
  await mkdir(outputDir, { recursive: true });

  // Save all outputs
  const fileNames: Record<string, string> = {
    llms: 'llms.txt',
    'llms-full': 'llms-full.txt',
    markdown: 'API.md',
    json: 'api.json',
  };

  for (const [format, filename] of Object.entries(fileNames)) {
    const content = result.outputs[format];
    if (content) {
      const path = join(outputDir, filename);
      await writeFile(path, content, 'utf-8');
      console.log(`✓ Saved ${path}`);
    }
  }

  // Print summary
  console.log('\n--- Summary ---');
  console.log(`Package: ${result.package.name}@${result.package.version}`);
  console.log(`Description: ${result.package.description}`);
  console.log(`API entries: ${result.api.length}`);
  console.log(`Token count: ${result.tokenCount}`);
  console.log(`Truncated: ${result.truncated}`);
  console.log(`From cache: ${result.fromCache}`);
  console.log(`Duration: ${result.duration}ms`);

  // Print API summary
  const functions = result.api.filter((e) => e.kind === 'function');
  const classes = result.api.filter((e) => e.kind === 'class');
  const interfaces = result.api.filter((e) => e.kind === 'interface');
  const types = result.api.filter((e) => e.kind === 'type');

  console.log('\n--- API Breakdown ---');
  console.log(`Functions: ${functions.length}`);
  console.log(`Classes: ${classes.length}`);
  console.log(`Interfaces: ${interfaces.length}`);
  console.log(`Types: ${types.length}`);
}

main().catch(console.error);
