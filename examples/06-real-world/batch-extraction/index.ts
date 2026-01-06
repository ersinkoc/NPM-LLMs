/**
 * Batch package documentation extraction
 *
 * This example shows how to extract documentation for multiple packages
 * with progress tracking, error handling, and parallel processing.
 *
 * Usage:
 *   npx tsx examples/06-real-world/batch-extraction/index.ts
 */

import { createExtractor } from '../../../src/index.js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// Popular packages to document
const PACKAGES = [
  // Utility libraries
  'lodash',
  'date-fns',
  'uuid',
  'ms',
  'chalk',

  // Validation
  'zod',
  'yup',
  'joi',

  // HTTP
  'axios',
  'node-fetch',

  // Testing
  'vitest',
  'jest',

  // Build tools
  'esbuild',
  'tsup',

  // React ecosystem
  'react',
  'react-dom',

  // CLI
  'commander',
  'yargs',
];

interface ExtractionResult {
  name: string;
  version: string;
  success: boolean;
  duration: number;
  tokenCount?: number;
  apiCount?: number;
  error?: string;
}

async function extractPackage(
  extractor: ReturnType<typeof createExtractor>,
  packageName: string,
  outputDir: string
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    const result = await extractor.extract(packageName, {
      formats: ['llms', 'llms-full', 'json'],
      llmsTokenLimit: 2000,
      prioritize: ['functions', 'classes', 'examples'],
    });

    // Save files
    const safeName = packageName.replace(/\//g, '__');
    const pkgDir = join(outputDir, safeName);
    await mkdir(pkgDir, { recursive: true });

    if (result.outputs['llms']) {
      await writeFile(join(pkgDir, 'llms.txt'), result.outputs['llms'], 'utf-8');
    }
    if (result.outputs['llms-full']) {
      await writeFile(join(pkgDir, 'llms-full.txt'), result.outputs['llms-full'], 'utf-8');
    }
    if (result.outputs['json']) {
      await writeFile(join(pkgDir, 'api.json'), result.outputs['json'], 'utf-8');
    }

    return {
      name: packageName,
      version: result.package.version,
      success: true,
      duration: Date.now() - startTime,
      tokenCount: result.tokenCount,
      apiCount: result.api.length,
    };
  } catch (error) {
    return {
      name: packageName,
      version: 'unknown',
      success: false,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log('=== Batch Package Extraction ===');
  console.log(`Processing ${PACKAGES.length} packages...`);
  console.log('');

  const outputDir = './batch-output';
  await mkdir(outputDir, { recursive: true });

  const extractor = createExtractor({
    cache: {
      enabled: true,
      dir: '.npm-llms-cache',
      ttl: 7 * 24 * 60 * 60 * 1000,
    },
    verbose: false,
  });

  const results: ExtractionResult[] = [];
  const concurrency = 3; // Process 3 at a time

  // Process in batches
  for (let i = 0; i < PACKAGES.length; i += concurrency) {
    const batch = PACKAGES.slice(i, i + concurrency);

    const batchPromises = batch.map((pkg) => extractPackage(extractor, pkg, outputDir));

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      results.push(result);

      const status = result.success ? 'OK' : 'FAIL';
      const details = result.success
        ? `${result.apiCount} APIs, ${result.tokenCount} tokens`
        : result.error;

      console.log(
        `[${results.length}/${PACKAGES.length}] ${result.name}@${result.version} - ${status} (${result.duration}ms)`
      );
      if (!result.success) {
        console.log(`  Error: ${details}`);
      }
    }
  }

  // Generate summary report
  const report = generateReport(results);
  await writeFile(join(outputDir, 'report.md'), report, 'utf-8');

  // Print summary
  console.log('');
  console.log('=== Summary ===');

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`Total: ${results.length}`);
  console.log(`Success: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);

  if (successful.length > 0) {
    const totalTokens = successful.reduce((sum, r) => sum + (r.tokenCount || 0), 0);
    const totalApis = successful.reduce((sum, r) => sum + (r.apiCount || 0), 0);
    const avgDuration = Math.round(
      successful.reduce((sum, r) => sum + r.duration, 0) / successful.length
    );

    console.log(`Total tokens: ${totalTokens.toLocaleString()}`);
    console.log(`Total APIs: ${totalApis.toLocaleString()}`);
    console.log(`Avg duration: ${avgDuration}ms`);
  }

  console.log('');
  console.log(`Output: ${outputDir}/`);
  console.log(`Report: ${outputDir}/report.md`);
}

function generateReport(results: ExtractionResult[]): string {
  const lines: string[] = [];

  lines.push('# Batch Extraction Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|--------|-------|');
  lines.push(`| Total Packages | ${results.length} |`);
  lines.push(`| Successful | ${results.filter((r) => r.success).length} |`);
  lines.push(`| Failed | ${results.filter((r) => !r.success).length} |`);
  lines.push('');

  // Successful packages
  const successful = results.filter((r) => r.success);
  if (successful.length > 0) {
    lines.push('## Successful Extractions');
    lines.push('');
    lines.push('| Package | Version | APIs | Tokens | Duration |');
    lines.push('|---------|---------|------|--------|----------|');

    for (const r of successful) {
      lines.push(
        `| ${r.name} | ${r.version} | ${r.apiCount} | ${r.tokenCount} | ${r.duration}ms |`
      );
    }
    lines.push('');
  }

  // Failed packages
  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    lines.push('## Failed Extractions');
    lines.push('');
    lines.push('| Package | Error |');
    lines.push('|---------|-------|');

    for (const r of failed) {
      lines.push(`| ${r.name} | ${r.error} |`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('Generated with @oxog/npm-llms');

  return lines.join('\n');
}

main().catch(console.error);
