/**
 * Minimal example - Extract llms.txt from a package
 *
 * Run with: npx tsx examples/01-basic/minimal.ts
 */

import { createExtractor } from '../../src/index.js';

async function main() {
  // Create an extractor instance
  const extractor = createExtractor();

  // Extract documentation from lodash
  const result = await extractor.extract('lodash', {
    formats: ['llms'],
  });

  // Print the generated llms.txt
  console.log(result.outputs['llms']);

  // Print some stats
  console.log('\n--- Stats ---');
  console.log(`Package: ${result.package.name}@${result.package.version}`);
  console.log(`API entries: ${result.api.length}`);
  console.log(`Token count: ${result.tokenCount}`);
  console.log(`Duration: ${result.duration}ms`);
}

main().catch(console.error);
