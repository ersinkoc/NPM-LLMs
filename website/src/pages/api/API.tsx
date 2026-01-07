import { Sidebar } from '@/components/layout/Sidebar';
import { CodeBlock } from '@/components/code/CodeBlock';

const extractPackageInfoExample = `import { extractPackageInfo } from '@oxog/npm-llms';
import type { PackageInfo, ExtractOptions } from '@oxog/npm-llms';

// Basic usage
const info = await extractPackageInfo('lodash');

// With options
const options: ExtractOptions = {
  includeReadme: true,
  includeTypes: true,
  includeExamples: true,
  maxTokens: 8000,
};

const infoWithOptions = await extractPackageInfo('axios', options);`;

const packageInfoType = `interface PackageInfo {
  name: string;
  version: string;
  description: string;
  repository?: string;
  homepage?: string;
  license?: string;
  keywords: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  readme?: string;
  functions: FunctionInfo[];
  types: TypeInfo[];
  examples: Example[];
}

interface FunctionInfo {
  name: string;
  description: string;
  signature: string;
  parameters: ParameterInfo[];
  returns: string;
  examples?: string[];
}

interface TypeInfo {
  name: string;
  kind: 'interface' | 'type' | 'class' | 'enum';
  definition: string;
  description?: string;
}`;

const formattersExample = `import {
  formatAsLlmsTxt,
  formatAsLlmsFullTxt,
  formatAsMarkdown,
  formatAsJson,
} from '@oxog/npm-llms';

// Extract package info first
const info = await extractPackageInfo('express');

// Format as llms.txt (concise, token-limited)
const llmsTxt = formatAsLlmsTxt(info);

// Format as llms-full.txt (complete)
const fullTxt = formatAsLlmsFullTxt(info);

// Format as Markdown
const markdown = formatAsMarkdown(info);

// Format as JSON
const json = formatAsJson(info);`;

const cacheExample = `import { createCache, clearCache } from '@oxog/npm-llms';

// Create cache with custom options
const cache = createCache({
  directory: './.npm-llms-cache',
  ttl: 24 * 60 * 60 * 1000, // 24 hours
});

// Clear all cache
await clearCache();

// Clear specific package cache
await clearCache('lodash');`;

const errorsExample = `import { extractPackageInfo, isNpmLlmsError } from '@oxog/npm-llms';

try {
  const info = await extractPackageInfo('non-existent-package');
} catch (error) {
  if (isNpmLlmsError(error)) {
    console.log('Error code:', error.code);
    console.log('Error message:', error.message);

    switch (error.code) {
      case 'PACKAGE_NOT_FOUND':
        console.log('Package does not exist');
        break;
      case 'NETWORK_ERROR':
        console.log('Network request failed');
        break;
      case 'PARSE_ERROR':
        console.log('Failed to parse package data');
        break;
    }
  }
}`;

export function API() {
  return (
    <div className="container py-12">
      <div className="flex gap-12">
        <Sidebar />

        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">API Reference</h1>
          <p className="text-xl text-[var(--color-muted-foreground)] mb-8">
            Complete API documentation for npm-llms programmatic usage.
          </p>

          <div className="space-y-10">
            <section id="extract-package-info">
              <h2 className="text-2xl font-semibold mb-4">extractPackageInfo</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Extract documentation from an NPM package.
              </p>
              <CodeBlock code={extractPackageInfoExample} language="typescript" filename="extract.ts" />

              <h3 className="text-xl font-semibold mt-6 mb-3">Options</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 pr-4">Option</th>
                      <th className="text-left py-3 pr-4">Type</th>
                      <th className="text-left py-3 pr-4">Default</th>
                      <th className="text-left py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--color-muted-foreground)]">
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>includeReadme</code></td>
                      <td className="py-3 pr-4">boolean</td>
                      <td className="py-3 pr-4">true</td>
                      <td className="py-3">Include README content</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>includeTypes</code></td>
                      <td className="py-3 pr-4">boolean</td>
                      <td className="py-3 pr-4">true</td>
                      <td className="py-3">Parse TypeScript types</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>includeExamples</code></td>
                      <td className="py-3 pr-4">boolean</td>
                      <td className="py-3 pr-4">true</td>
                      <td className="py-3">Extract code examples</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>maxTokens</code></td>
                      <td className="py-3 pr-4">number</td>
                      <td className="py-3 pr-4">8000</td>
                      <td className="py-3">Max tokens for llms.txt</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>aiProvider</code></td>
                      <td className="py-3 pr-4">AIProvider</td>
                      <td className="py-3 pr-4">undefined</td>
                      <td className="py-3">AI enrichment provider</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4"><code>cache</code></td>
                      <td className="py-3 pr-4">boolean</td>
                      <td className="py-3 pr-4">true</td>
                      <td className="py-3">Enable caching</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section id="types">
              <h2 className="text-2xl font-semibold mb-4">Types</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                TypeScript type definitions for package data:
              </p>
              <CodeBlock code={packageInfoType} language="typescript" filename="types.ts" />
            </section>

            <section id="formatters">
              <h2 className="text-2xl font-semibold mb-4">Formatters</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Convert PackageInfo to various output formats:
              </p>
              <CodeBlock code={formattersExample} language="typescript" filename="formatters.ts" />

              <div className="mt-6 space-y-3">
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">formatAsLlmsTxt(info: PackageInfo): string</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Generate llms.txt format with smart token truncation.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">formatAsLlmsFullTxt(info: PackageInfo): string</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Generate complete llms-full.txt without truncation.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">formatAsMarkdown(info: PackageInfo): string</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Generate standard Markdown documentation.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">formatAsJson(info: PackageInfo): string</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Generate JSON output for programmatic processing.
                  </p>
                </div>
              </div>
            </section>

            <section id="cache">
              <h2 className="text-2xl font-semibold mb-4">Cache</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Manage the built-in file-based cache:
              </p>
              <CodeBlock code={cacheExample} language="typescript" filename="cache.ts" />
            </section>

            <section id="errors">
              <h2 className="text-2xl font-semibold mb-4">Error Handling</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Handle errors with typed error classes:
              </p>
              <CodeBlock code={errorsExample} language="typescript" filename="errors.ts" />

              <h3 className="text-xl font-semibold mt-6 mb-3">Error Codes</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">PACKAGE_NOT_FOUND</code>
                  <span className="text-[var(--color-muted-foreground)]">Package does not exist on npm</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">NETWORK_ERROR</code>
                  <span className="text-[var(--color-muted-foreground)]">Network request failed</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">PARSE_ERROR</code>
                  <span className="text-[var(--color-muted-foreground)]">Failed to parse package data</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">AI_PROVIDER_ERROR</code>
                  <span className="text-[var(--color-muted-foreground)]">AI enrichment failed</span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">CACHE_ERROR</code>
                  <span className="text-[var(--color-muted-foreground)]">Cache operation failed</span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
