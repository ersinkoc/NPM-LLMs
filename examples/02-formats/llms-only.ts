/**
 * Generate only llms.txt with custom token limit
 *
 * Run with: npx tsx examples/02-formats/llms-only.ts
 */

import { createExtractor } from '../../src/index.js';

async function main() {
  const extractor = createExtractor();

  // Extract only llms.txt with custom token limit
  const result = await extractor.extract('express', {
    formats: ['llms'],
    llmsTokenLimit: 1500, // Smaller limit
    prioritize: ['functions', 'examples', 'readme'],
  });

  console.log('=== llms.txt ===\n');
  console.log(result.outputs['llms']);

  console.log('\n=== Stats ===');
  console.log(`Tokens: ${result.tokenCount}`);
  console.log(`Truncated: ${result.truncated}`);
}

main().catch(console.error);
