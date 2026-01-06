/**
 * AI enrichment with Ollama (local models)
 *
 * This example shows how to use locally running Ollama models
 * for AI enrichment - no API key required!
 *
 * Requirements:
 * - Ollama installed and running (https://ollama.ai)
 * - A model pulled (e.g., `ollama pull llama3.2`)
 *
 * Run with: npx tsx examples/03-ai-enrichment/with-ollama.ts
 */

import { createExtractor } from '../../src/index.js';
import {
  createOllamaPlugin,
  checkOllamaAvailable,
  listOllamaModels,
} from '../../src/plugins/optional/ollama-ai.js';

async function main() {
  // Check if Ollama is running
  console.log('Checking Ollama availability...');
  const isAvailable = await checkOllamaAvailable();

  if (!isAvailable) {
    console.error('Error: Ollama is not running');
    console.log('');
    console.log('To install Ollama:');
    console.log('1. Visit https://ollama.ai and download');
    console.log('2. Run: ollama serve');
    console.log('3. Pull a model: ollama pull llama3.2');
    process.exit(1);
  }

  // List available models
  console.log('Ollama is running!');
  try {
    const models = await listOllamaModels();
    console.log(`Available models: ${models.join(', ')}`);

    if (models.length === 0) {
      console.error('No models found. Pull one with: ollama pull llama3.2');
      process.exit(1);
    }
  } catch {
    console.log('Could not list models, proceeding with default...');
  }

  // Create Ollama plugin
  const ollamaPlugin = createOllamaPlugin(
    {
      // Use a fast local model
      model: 'llama3.2',
      // Ollama default URL
      baseUrl: 'http://localhost:11434',
      // Local models can be slower
      timeout: 120000,
    },
    {
      tasks: ['descriptions', 'examples'],
      // Process fewer at a time for local models
      batchSize: 2,
      skipExisting: true,
    }
  );

  const extractor = createExtractor({
    verbose: true,
  });

  extractor.use(ollamaPlugin);

  console.log('\nExtracting and enriching documentation for "ms" package...\n');

  const result = await extractor.extract('ms', {
    formats: ['llms'],
    enrichWithAI: true,
    aiTasks: ['descriptions', 'examples'],
    llmsTokenLimit: 1500,
  });

  // Display results
  console.log('\n=== Package Info ===');
  console.log(`Name: ${result.package.name}`);
  console.log(`Version: ${result.package.version}`);
  console.log(`API Entries: ${result.api.length}`);

  console.log('\n=== Enriched API ===');
  for (const entry of result.api) {
    console.log(`\n${entry.kind}: ${entry.name}`);
    if (entry.description) {
      console.log(`  ${entry.description}`);
    }
    if (entry.examples && entry.examples.length > 0) {
      console.log(`  Example: ${entry.examples[0]}`);
    }
  }

  console.log('\n=== llms.txt ===');
  console.log(result.outputs['llms']);

  console.log('\n=== Stats ===');
  console.log(`Token count: ${result.tokenCount}`);
  console.log(`Duration: ${result.duration}ms`);
}

main().catch(console.error);
