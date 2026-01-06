/**
 * AI enrichment with Claude (Anthropic)
 *
 * This example shows how to use Claude to enhance API documentation
 * with better descriptions, examples, and summaries.
 *
 * Requirements:
 * - ANTHROPIC_API_KEY environment variable set
 *
 * Run with: npx tsx examples/03-ai-enrichment/with-claude.ts
 */

import { createExtractor } from '../../src/index.js';
import { createClaudePlugin } from '../../src/plugins/optional/claude-ai.js';

async function main() {
  // Check for API key
  if (!process.env['ANTHROPIC_API_KEY']) {
    console.error('Error: ANTHROPIC_API_KEY environment variable is required');
    console.log('Set it with: export ANTHROPIC_API_KEY=your-key-here');
    process.exit(1);
  }

  // Create Claude plugin with custom options
  const claudePlugin = createClaudePlugin(
    {
      // Use claude-3-haiku for speed, claude-3-opus for quality
      model: 'claude-3-haiku-20240307',
      maxTokens: 512,
      temperature: 0.3,
    },
    {
      // What to enrich
      tasks: ['descriptions', 'examples', 'summary'],
      // Process 3 entries at a time
      batchSize: 3,
      // Skip entries that already have descriptions
      skipExisting: true,
    }
  );

  // Create extractor with Claude
  const extractor = createExtractor({
    verbose: true,
  });

  extractor.use(claudePlugin);

  console.log('Extracting and enriching documentation for "ms" package...\n');

  // Extract with AI enrichment enabled
  const result = await extractor.extract('ms', {
    formats: ['llms', 'markdown'],
    enrichWithAI: true,
    aiTasks: ['descriptions', 'examples', 'summary'],
    llmsTokenLimit: 2000,
  });

  // Show results
  console.log('\n=== Package Info ===');
  console.log(`Name: ${result.package.name}`);
  console.log(`Version: ${result.package.version}`);
  console.log(`API Entries: ${result.api.length}`);

  // Show enriched descriptions
  console.log('\n=== Enriched API ===');
  for (const entry of result.api.slice(0, 5)) {
    console.log(`\n${entry.kind}: ${entry.name}`);
    if (entry.description) {
      console.log(`  Description: ${entry.description}`);
    }
    if (entry.examples && entry.examples.length > 0) {
      console.log(`  Example: ${entry.examples[0]}`);
    }
  }

  console.log('\n=== llms.txt Preview ===');
  console.log(result.outputs['llms']?.slice(0, 500) + '...\n');

  console.log(`Total tokens: ${result.tokenCount}`);
  console.log(`Duration: ${result.duration}ms`);
}

main().catch(console.error);
