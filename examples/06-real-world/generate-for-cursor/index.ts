/**
 * Generate llms.txt files for Cursor/Copilot/Claude
 *
 * This example shows how to generate documentation files that can be
 * added to your project for AI coding assistants to reference.
 *
 * Usage:
 *   npx tsx examples/06-real-world/generate-for-cursor/index.ts
 *
 * Output:
 *   Creates .llms/ directory with documentation for your dependencies
 */

import { createExtractor } from '../../../src/index.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

async function main() {
  // Read package.json to get dependencies
  const pkgPath = process.argv[2] || './package.json';
  let pkg: PackageJson;

  try {
    const content = await readFile(pkgPath, 'utf-8');
    pkg = JSON.parse(content) as PackageJson;
  } catch {
    console.error(`Could not read ${pkgPath}`);
    console.log('Usage: npx tsx index.ts [path/to/package.json]');
    process.exit(1);
  }

  // Combine all dependencies
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const depNames = Object.keys(allDeps);

  if (depNames.length === 0) {
    console.log('No dependencies found in package.json');
    return;
  }

  console.log(`Found ${depNames.length} dependencies`);
  console.log('');

  // Create output directory
  const outputDir = '.llms';
  await mkdir(outputDir, { recursive: true });

  // Create extractor
  const extractor = createExtractor({
    cache: {
      enabled: true,
      dir: '.npm-llms-cache',
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });

  // Track results
  const results: Array<{ name: string; success: boolean; tokens?: number }> = [];

  // Process each dependency
  for (const name of depNames) {
    process.stdout.write(`Extracting ${name}... `);

    try {
      const result = await extractor.extract(name, {
        formats: ['llms'],
        llmsTokenLimit: 2000,
        prioritize: ['functions', 'examples'],
      });

      // Save to file
      const safeName = name.replace(/\//g, '__'); // Handle scoped packages
      const outputPath = join(outputDir, `${safeName}.txt`);
      await writeFile(outputPath, result.outputs['llms'] || '', 'utf-8');

      console.log(`OK (${result.tokenCount} tokens)`);
      results.push({ name, success: true, tokens: result.tokenCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log(`FAILED: ${message}`);
      results.push({ name, success: false });
    }
  }

  // Create index file
  const indexContent = generateIndexFile(results);
  await writeFile(join(outputDir, 'index.md'), indexContent, 'utf-8');

  // Summary
  console.log('');
  console.log('=== Summary ===');
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  console.log(`Success: ${successful.length}/${results.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length > 0) {
    console.log(`Failed packages: ${failed.map((r) => r.name).join(', ')}`);
  }
  console.log('');
  console.log(`Output directory: ${outputDir}/`);
  console.log('');
  console.log('Add to .cursorrules or similar:');
  console.log('  Reference the files in .llms/ for API documentation');
}

function generateIndexFile(
  results: Array<{ name: string; success: boolean; tokens?: number }>
): string {
  const lines: string[] = [];

  lines.push('# Project Dependencies Documentation');
  lines.push('');
  lines.push('Auto-generated API documentation for project dependencies.');
  lines.push('');
  lines.push('## Available Documentation');
  lines.push('');

  const successful = results.filter((r) => r.success);
  for (const r of successful) {
    const safeName = r.name.replace(/\//g, '__');
    lines.push(`- [${r.name}](./${safeName}.txt) (${r.tokens} tokens)`);
  }

  if (successful.length === 0) {
    lines.push('No documentation generated.');
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    lines.push('');
    lines.push('## Failed Extractions');
    lines.push('');
    for (const r of failed) {
      lines.push(`- ${r.name}`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push(`Generated with @oxog/npm-llms on ${new Date().toISOString()}`);

  return lines.join('\n');
}

main().catch(console.error);
