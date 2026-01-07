import { Sidebar } from '@/components/layout/Sidebar';
import { CodeBlock } from '@/components/code/CodeBlock';

const extractCommand = `# Basic extraction
npx @oxog/npm-llms extract <package-name>

# Examples
npx @oxog/npm-llms extract lodash
npx @oxog/npm-llms extract @types/node
npx @oxog/npm-llms extract react@18.2.0`;

const outputOptions = `# Generate llms.txt (default)
npx @oxog/npm-llms extract lodash --llms

# Generate llms-full.txt
npx @oxog/npm-llms extract lodash --llms-full

# Generate Markdown
npx @oxog/npm-llms extract lodash --markdown

# Generate JSON
npx @oxog/npm-llms extract lodash --json

# Generate all formats
npx @oxog/npm-llms extract lodash --all`;

const outputDirectory = `# Save to custom directory
npx @oxog/npm-llms extract lodash -o ./docs

# Output to stdout
npx @oxog/npm-llms extract lodash --stdout

# Verbose mode
npx @oxog/npm-llms extract lodash -v`;

const cacheCommands = `# Clear cache
npx @oxog/npm-llms cache-clear

# Clear specific package cache
npx @oxog/npm-llms cache-clear lodash`;

export function DocsCLI() {
  return (
    <div className="container py-12">
      <div className="flex gap-12">
        <Sidebar />

        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">CLI Commands</h1>
          <p className="text-xl text-[var(--color-muted-foreground)] mb-8">
            Complete reference for npm-llms command-line interface.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="text-2xl font-semibold mb-4">extract</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Extract documentation from an NPM package.
              </p>
              <CodeBlock code={extractCommand} language="bash" showLineNumbers={false} />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Output Format Options</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Choose the output format for extracted documentation:
              </p>
              <CodeBlock code={outputOptions} language="bash" showLineNumbers={false} />

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">--llms</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Generate llms.txt with smart token truncation (default)
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">--llms-full</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Generate llms-full.txt without truncation
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">--markdown</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Generate Markdown documentation
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">--json</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Generate JSON output
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">--all</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Generate all output formats
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Output Options</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Control where and how output is written:
              </p>
              <CodeBlock code={outputDirectory} language="bash" showLineNumbers={false} />

              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">-o, --output</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Output directory for generated files
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">--stdout</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Output to stdout instead of files
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <code className="px-2 py-1 bg-[var(--color-muted)] rounded text-sm">-v, --verbose</code>
                  <span className="text-[var(--color-muted-foreground)]">
                    Enable verbose output
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Cache Management</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Manage the built-in cache:
              </p>
              <CodeBlock code={cacheCommands} language="bash" showLineNumbers={false} />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">All Options</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 pr-4">Option</th>
                      <th className="text-left py-3 pr-4">Alias</th>
                      <th className="text-left py-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--color-muted-foreground)]">
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--llms</code></td>
                      <td className="py-3 pr-4">-</td>
                      <td className="py-3">Generate llms.txt format</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--llms-full</code></td>
                      <td className="py-3 pr-4">-</td>
                      <td className="py-3">Generate llms-full.txt format</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--markdown</code></td>
                      <td className="py-3 pr-4"><code>-m</code></td>
                      <td className="py-3">Generate Markdown format</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--json</code></td>
                      <td className="py-3 pr-4"><code>-j</code></td>
                      <td className="py-3">Generate JSON format</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--all</code></td>
                      <td className="py-3 pr-4"><code>-a</code></td>
                      <td className="py-3">Generate all formats</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--output</code></td>
                      <td className="py-3 pr-4"><code>-o</code></td>
                      <td className="py-3">Output directory</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--stdout</code></td>
                      <td className="py-3 pr-4">-</td>
                      <td className="py-3">Output to stdout</td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4"><code>--verbose</code></td>
                      <td className="py-3 pr-4"><code>-v</code></td>
                      <td className="py-3">Verbose output</td>
                    </tr>
                    <tr>
                      <td className="py-3 pr-4"><code>--version</code></td>
                      <td className="py-3 pr-4"><code>-V</code></td>
                      <td className="py-3">Show version number</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
