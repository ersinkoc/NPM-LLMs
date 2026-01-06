/**
 * AI enrichment with OpenAI (GPT)
 *
 * This example shows how to use OpenAI's GPT models to enhance API documentation.
 *
 * Requirements:
 * - OPENAI_API_KEY environment variable set
 *
 * Run with: npx tsx examples/03-ai-enrichment/with-openai.ts
 */

import { createExtractor } from '../../src/index.js';
import { createOpenAIPlugin } from '../../src/plugins/optional/openai-ai.js';

async function main() {
  // Check for API key
  if (!process.env['OPENAI_API_KEY']) {
    console.error('Error: OPENAI_API_KEY environment variable is required');
    console.log('Set it with: export OPENAI_API_KEY=your-key-here');
    process.exit(1);
  }

  // Create OpenAI plugin
  const openaiPlugin = createOpenAIPlugin(
    {
      // gpt-4o-mini for balance of speed/cost, gpt-4o for best quality
      model: 'gpt-4o-mini',
      maxTokens: 512,
      temperature: 0.3,
    },
    {
      tasks: ['descriptions', 'examples'],
      batchSize: 5,
      skipExisting: true,
    }
  );

  const extractor = createExtractor({
    verbose: true,
  });

  extractor.use(openaiPlugin);

  console.log('Extracting and enriching documentation for "chalk" package...\n');

  const result = await extractor.extract('chalk', {
    formats: ['llms', 'json'],
    enrichWithAI: true,
    aiTasks: ['descriptions', 'examples'],
    llmsTokenLimit: 2000,
  });

  // Display results
  console.log('\n=== Package Info ===');
  console.log(`Name: ${result.package.name}`);
  console.log(`Version: ${result.package.version}`);
  console.log(`API Entries: ${result.api.length}`);

  // Show a few enriched entries
  console.log('\n=== Enriched Functions ===');
  const functions = result.api.filter((e) => e.kind === 'function').slice(0, 3);
  for (const fn of functions) {
    console.log(`\nFunction: ${fn.name}`);
    console.log(`  Signature: ${fn.signature}`);
    if (fn.description) {
      console.log(`  Description: ${fn.description}`);
    }
  }

  console.log('\n=== Stats ===');
  console.log(`Token count: ${result.tokenCount}`);
  console.log(`Truncated: ${result.truncated}`);
  console.log(`Duration: ${result.duration}ms`);
}

main().catch(console.error);
