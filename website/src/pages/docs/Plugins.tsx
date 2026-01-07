import { Sidebar } from '@/components/layout/Sidebar';
import { CodeBlock } from '@/components/code/CodeBlock';

const pluginExample = `import { definePlugin } from '@oxog/npm-llms';

const myPlugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',

  hooks: {
    // Called before extraction starts
    'extract:before': async (context) => {
      console.log(\`Extracting \${context.packageName}\`);
    },

    // Called after extraction completes
    'extract:after': async (context, result) => {
      console.log(\`Extracted \${result.functions.length} functions\`);
      return result;
    },

    // Called before formatting
    'format:before': async (context, data) => {
      return data;
    },

    // Called after formatting
    'format:after': async (context, output) => {
      return output;
    },
  },
});`;

const usingPlugins = `import { extractPackageInfo } from '@oxog/npm-llms';
import { createClaudeProvider } from '@oxog/npm-llms/plugins/claude-ai';

// Create AI provider plugin
const claude = createClaudeProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Use plugin during extraction
const info = await extractPackageInfo('lodash', {
  plugins: [claude],
});`;

const customOutputPlugin = `import { definePlugin } from '@oxog/npm-llms';
import type { PackageInfo } from '@oxog/npm-llms';

const xmlOutputPlugin = definePlugin({
  name: 'xml-output',
  version: '1.0.0',

  hooks: {
    'format:after': async (context, output) => {
      if (context.format !== 'xml') return output;

      const info = context.packageInfo as PackageInfo;
      return \`<?xml version="1.0" encoding="UTF-8"?>
<package>
  <name>\${info.name}</name>
  <version>\${info.version}</version>
  <description>\${info.description}</description>
</package>\`;
    },
  },
});`;

export function DocsPlugins() {
  return (
    <div className="container py-12">
      <div className="flex gap-12">
        <Sidebar />

        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Plugin System</h1>
          <p className="text-xl text-[var(--color-muted-foreground)] mb-8">
            Extend npm-llms functionality with a flexible plugin architecture.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Overview</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                npm-llms uses a micro-kernel architecture with event-based hooks.
                Plugins can intercept and modify data at various stages of the
                extraction and formatting pipeline.
              </p>

              <h3 className="text-xl font-semibold mt-6 mb-3">Available Hooks</h3>
              <div className="space-y-3">
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">extract:before</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Called before extraction starts. Can modify extraction options.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">extract:after</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Called after extraction completes. Can modify the extracted data.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">format:before</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Called before formatting. Can modify data before output generation.
                  </p>
                </div>
                <div className="p-4 border border-[var(--color-border)] rounded-lg">
                  <code className="text-sm font-medium">format:after</code>
                  <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                    Called after formatting. Can modify the final output.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Creating a Plugin</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Use the <code>definePlugin</code> helper to create type-safe plugins:
              </p>
              <CodeBlock code={pluginExample} language="typescript" filename="my-plugin.ts" />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Using Plugins</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Pass plugins to the extraction function:
              </p>
              <CodeBlock code={usingPlugins} language="typescript" filename="extract.ts" />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Custom Output Format</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Create plugins that add new output formats:
              </p>
              <CodeBlock code={customOutputPlugin} language="typescript" filename="xml-plugin.ts" />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Built-in Plugins</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                npm-llms includes several built-in plugins:
              </p>
              <ul className="space-y-2 text-[var(--color-muted-foreground)]">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  <strong>README Parser</strong> - Extracts examples from README.md
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  <strong>TypeScript Parser</strong> - Parses .d.ts type definitions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  <strong>Token Truncator</strong> - Smart truncation for context limits
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  <strong>Cache Manager</strong> - File-based caching with TTL
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
