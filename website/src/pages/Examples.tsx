import { CodeBlock } from '@/components/code/CodeBlock';

const basicExample = `import { extractPackageInfo, formatAsLlmsTxt } from '@oxog/npm-llms';

async function main() {
  // Extract package documentation
  const info = await extractPackageInfo('lodash');

  // Generate llms.txt format
  const output = formatAsLlmsTxt(info);

  console.log(output);
}

main();`;

const multipleFormatsExample = `import {
  extractPackageInfo,
  formatAsLlmsTxt,
  formatAsLlmsFullTxt,
  formatAsMarkdown,
  formatAsJson,
} from '@oxog/npm-llms';
import { writeFile } from 'fs/promises';

async function generateDocs(packageName: string) {
  const info = await extractPackageInfo(packageName);

  // Generate all formats
  await Promise.all([
    writeFile(\`\${packageName}.llms.txt\`, formatAsLlmsTxt(info)),
    writeFile(\`\${packageName}.llms-full.txt\`, formatAsLlmsFullTxt(info)),
    writeFile(\`\${packageName}.md\`, formatAsMarkdown(info)),
    writeFile(\`\${packageName}.json\`, formatAsJson(info)),
  ]);

  console.log(\`Generated documentation for \${packageName}\`);
}

generateDocs('axios');`;

const aiEnrichmentExample = `import { extractPackageInfo, formatAsLlmsTxt } from '@oxog/npm-llms';
import { createClaudeProvider } from '@oxog/npm-llms/plugins/claude-ai';

async function generateEnrichedDocs() {
  // Create AI provider
  const claude = createClaudeProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-haiku-4-5',
  });

  // Extract with AI enrichment
  const info = await extractPackageInfo('express', {
    aiProvider: claude,
  });

  // AI will add:
  // - Improved function descriptions
  // - Usage examples
  // - Best practices
  const output = formatAsLlmsTxt(info);

  console.log(output);
}

generateEnrichedDocs();`;

const batchProcessingExample = `import { extractPackageInfo, formatAsLlmsTxt } from '@oxog/npm-llms';
import { writeFile, mkdir } from 'fs/promises';

const packages = [
  'lodash',
  'express',
  'axios',
  'react',
  'zod',
  'prisma',
];

async function batchProcess() {
  await mkdir('./docs', { recursive: true });

  const results = await Promise.allSettled(
    packages.map(async (pkg) => {
      console.log(\`Processing \${pkg}...\`);
      const info = await extractPackageInfo(pkg);
      const output = formatAsLlmsTxt(info);
      await writeFile(\`./docs/\${pkg}.llms.txt\`, output);
      return pkg;
    })
  );

  const successful = results.filter(r => r.status === 'fulfilled').length;
  console.log(\`\\nProcessed \${successful}/\${packages.length} packages\`);
}

batchProcess();`;

const customPluginExample = `import { extractPackageInfo, definePlugin } from '@oxog/npm-llms';

// Create a plugin that adds custom metadata
const metadataPlugin = definePlugin({
  name: 'metadata-plugin',
  version: '1.0.0',

  hooks: {
    'extract:after': async (context, result) => {
      return {
        ...result,
        metadata: {
          extractedAt: new Date().toISOString(),
          source: 'npm-llms',
          version: '1.0.0',
        },
      };
    },
  },
});

async function extractWithMetadata() {
  const info = await extractPackageInfo('lodash', {
    plugins: [metadataPlugin],
  });

  console.log('Metadata:', info.metadata);
}

extractWithMetadata();`;

const openaiCompatibleExample = `import { extractPackageInfo, formatAsLlmsTxt } from '@oxog/npm-llms';
import {
  createXAIProvider,
  createDeepSeekProvider,
  createTogetherProvider,
} from '@oxog/npm-llms/plugins/openai-ai';

// Use x.ai (Grok)
const xai = createXAIProvider({
  apiKey: process.env.XAI_API_KEY,
  model: 'grok-3-mini-fast',
});

// Use DeepSeek
const deepseek = createDeepSeekProvider({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: 'deepseek-chat',
});

// Use Together AI
const together = createTogetherProvider({
  apiKey: process.env.TOGETHER_API_KEY,
  model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
});

async function testProviders() {
  // Use any provider
  const info = await extractPackageInfo('zod', {
    aiProvider: xai, // or deepseek, together
  });

  console.log(formatAsLlmsTxt(info));
}

testProviders();`;

export function Examples() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Examples</h1>
        <p className="text-xl text-[var(--color-muted-foreground)] mb-12">
          Learn npm-llms through practical examples.
        </p>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold mb-4">Basic Extraction</h2>
            <p className="text-[var(--color-muted-foreground)] mb-4">
              Extract documentation from a single package and format as llms.txt:
            </p>
            <CodeBlock code={basicExample} language="typescript" filename="basic.ts" />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Multiple Output Formats</h2>
            <p className="text-[var(--color-muted-foreground)] mb-4">
              Generate all available output formats for a package:
            </p>
            <CodeBlock code={multipleFormatsExample} language="typescript" filename="multiple-formats.ts" />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">AI Enrichment</h2>
            <p className="text-[var(--color-muted-foreground)] mb-4">
              Enhance documentation with AI-generated content:
            </p>
            <CodeBlock code={aiEnrichmentExample} language="typescript" filename="ai-enrichment.ts" />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Batch Processing</h2>
            <p className="text-[var(--color-muted-foreground)] mb-4">
              Process multiple packages in parallel:
            </p>
            <CodeBlock code={batchProcessingExample} language="typescript" filename="batch.ts" />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Custom Plugin</h2>
            <p className="text-[var(--color-muted-foreground)] mb-4">
              Create a custom plugin to extend functionality:
            </p>
            <CodeBlock code={customPluginExample} language="typescript" filename="custom-plugin.ts" />
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">OpenAI-Compatible Providers</h2>
            <p className="text-[var(--color-muted-foreground)] mb-4">
              Use various OpenAI-compatible AI providers:
            </p>
            <CodeBlock code={openaiCompatibleExample} language="typescript" filename="openai-compatible.ts" />
          </section>
        </div>
      </div>
    </div>
  );
}
