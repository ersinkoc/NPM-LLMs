import { CodeBlock } from '../components/CodeBlock';

const basicExample = `import { extract } from '@oxog/npm-llms';

// Simplest usage
const result = await extract('lodash');
console.log(result.outputs['llms']);`;

const withOptionsExample = `import { createExtractor } from '@oxog/npm-llms';

const extractor = createExtractor({
  cache: { enabled: true, ttl: 7 * 24 * 60 * 60 * 1000 },
  verbose: true,
});

const result = await extractor.extract('zod@3.22.0', {
  formats: ['llms', 'llms-full', 'markdown', 'json'],
  llmsTokenLimit: 2000,
  prioritize: ['functions', 'examples'],
});

// Save outputs
for (const [format, content] of Object.entries(result.outputs)) {
  console.log(\`=== \${format} ===\`);
  console.log(content.slice(0, 500));
}`;

const aiEnrichmentExample = `import { createExtractor } from '@oxog/npm-llms';
import { createClaudePlugin } from '@oxog/npm-llms/plugins';

const extractor = createExtractor();

// Add Claude AI enrichment
extractor.use(createClaudePlugin({
  model: 'claude-3-haiku-20240307',
  maxTokens: 512,
}));

const result = await extractor.extract('ms', {
  formats: ['llms'],
  enrichWithAI: true,
  aiTasks: ['descriptions', 'examples'],
});`;

const ollamaExample = `import { createExtractor } from '@oxog/npm-llms';
import { createOllamaPlugin, checkOllamaAvailable } from '@oxog/npm-llms/plugins';

// Check if Ollama is running
if (await checkOllamaAvailable()) {
  const extractor = createExtractor();

  extractor.use(createOllamaPlugin({
    model: 'llama3.2',
    baseUrl: 'http://localhost:11434',
  }));

  const result = await extractor.extract('chalk', {
    enrichWithAI: true,
  });
}`;

const customPluginExample = `import { createExtractor, definePlugin } from '@oxog/npm-llms';

const myPlugin = definePlugin({
  name: 'my-custom-plugin',
  version: '1.0.0',
  category: 'output',

  install(kernel) {
    kernel.on('output:generate', async (ctx) => {
      // Generate custom output
      const yaml = ctx.api.map(entry =>
        \`- name: \${entry.name}\\n  kind: \${entry.kind}\`
      ).join('\\n');

      ctx.outputs.set('yaml', yaml);
    });
  },
});

const extractor = createExtractor();
extractor.use(myPlugin);`;

const batchExample = `import { createExtractor } from '@oxog/npm-llms';
import { writeFile, mkdir } from 'node:fs/promises';

const packages = ['lodash', 'zod', 'express', 'react'];
const extractor = createExtractor({ cache: { enabled: true } });

for (const pkg of packages) {
  console.log(\`Extracting \${pkg}...\`);

  const result = await extractor.extract(pkg, {
    formats: ['llms'],
    llmsTokenLimit: 1500,
  });

  await mkdir('./docs', { recursive: true });
  await writeFile(\`./docs/\${pkg}.txt\`, result.outputs['llms'] || '');

  console.log(\`  \${result.api.length} APIs, \${result.tokenCount} tokens\`);
}`;

export function Examples() {
  return (
    <div className="container mx-auto px-4 py-12">
      <article className="prose dark:prose-invert max-w-4xl mx-auto">
        <h1>Examples</h1>
        <p className="lead">
          Code examples demonstrating common use cases for @oxog/npm-llms.
        </p>

        <h2>Basic Usage</h2>
        <p>The simplest way to extract documentation:</p>
        <div className="not-prose my-4">
          <CodeBlock code={basicExample} language="typescript" filename="basic.ts" />
        </div>

        <h2>With Options</h2>
        <p>Configure the extractor with caching and multiple output formats:</p>
        <div className="not-prose my-4">
          <CodeBlock code={withOptionsExample} language="typescript" filename="with-options.ts" />
        </div>

        <h2>AI Enrichment with Claude</h2>
        <p>Enhance documentation with AI-generated descriptions and examples:</p>
        <div className="not-prose my-4">
          <CodeBlock code={aiEnrichmentExample} language="typescript" filename="with-claude.ts" />
        </div>

        <h2>Local AI with Ollama</h2>
        <p>Use local Ollama models for AI enrichment (no API key needed):</p>
        <div className="not-prose my-4">
          <CodeBlock code={ollamaExample} language="typescript" filename="with-ollama.ts" />
        </div>

        <h2>Custom Plugin</h2>
        <p>Create a custom plugin to extend functionality:</p>
        <div className="not-prose my-4">
          <CodeBlock code={customPluginExample} language="typescript" filename="custom-plugin.ts" />
        </div>

        <h2>Batch Extraction</h2>
        <p>Extract documentation for multiple packages:</p>
        <div className="not-prose my-4">
          <CodeBlock code={batchExample} language="typescript" filename="batch.ts" />
        </div>
      </article>
    </div>
  );
}
