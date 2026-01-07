import { Sidebar } from '@/components/layout/Sidebar';
import { CodeBlock } from '@/components/code/CodeBlock';

const cliBasicExample = `# Extract lodash documentation as llms.txt
npx @oxog/npm-llms extract lodash

# Extract with all output formats
npx @oxog/npm-llms extract express --all

# Save to custom directory
npx @oxog/npm-llms extract react -o ./docs

# Output to stdout
npx @oxog/npm-llms extract axios --stdout`;

const apiBasicExample = `import { extractPackageInfo, formatAsLlmsTxt } from '@oxog/npm-llms';

// Extract package information
const packageInfo = await extractPackageInfo('lodash');

// Format as llms.txt
const llmsTxt = formatAsLlmsTxt(packageInfo);
console.log(llmsTxt);

// Format as llms-full.txt
import { formatAsLlmsFullTxt } from '@oxog/npm-llms';
const fullTxt = formatAsLlmsFullTxt(packageInfo);`;

const outputExample = `# lodash

> A modern JavaScript utility library delivering modularity, performance & extras.

## Installation

\`\`\`bash
npm install lodash
\`\`\`

## Quick Start

\`\`\`javascript
const _ = require('lodash');

_.chunk(['a', 'b', 'c', 'd'], 2);
// => [['a', 'b'], ['c', 'd']]
\`\`\`

## API Reference

### _.chunk(array, [size=1])
Creates an array of elements split into groups.

### _.compact(array)
Creates an array with all falsey values removed.

...`;

const typescriptExample = `import { extractPackageInfo, formatAsMarkdown } from '@oxog/npm-llms';
import type { PackageInfo, ExtractOptions } from '@oxog/npm-llms';

const options: ExtractOptions = {
  includeReadme: true,
  includeTypes: true,
  maxTokens: 8000,
};

const info: PackageInfo = await extractPackageInfo('zod', options);
const markdown = formatAsMarkdown(info);`;

export function DocsQuickStart() {
  return (
    <div className="container py-12">
      <div className="flex gap-12">
        <Sidebar />

        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Quick Start</h1>
          <p className="text-xl text-[var(--color-muted-foreground)] mb-8">
            Get up and running with npm-llms in minutes.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Using the CLI</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                The fastest way to extract documentation is using the CLI:
              </p>
              <CodeBlock code={cliBasicExample} language="bash" filename="terminal" showLineNumbers={false} />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Using the API</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                For programmatic usage, import the functions directly:
              </p>
              <CodeBlock code={apiBasicExample} language="typescript" filename="extract.ts" />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Example Output</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                The llms.txt format provides a concise summary optimized for LLM context:
              </p>
              <CodeBlock code={outputExample} language="markdown" filename="lodash.llms.txt" />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">TypeScript Support</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Full TypeScript support with exported types:
              </p>
              <CodeBlock code={typescriptExample} language="typescript" filename="example.ts" />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Output Formats</h2>
              <div className="space-y-4">
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <h4 className="font-medium mb-2">llms.txt</h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Concise format with smart token truncation. Ideal for context-limited LLMs.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <h4 className="font-medium mb-2">llms-full.txt</h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Complete API documentation without truncation. Best for comprehensive analysis.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <h4 className="font-medium mb-2">Markdown</h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Standard Markdown format for documentation sites and README files.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <h4 className="font-medium mb-2">JSON</h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Structured JSON for programmatic processing and integration.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
