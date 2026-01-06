import { NavLink, Routes, Route } from 'react-router-dom';
import { clsx } from 'clsx';
import { CodeBlock } from '../components/CodeBlock';
import { InstallTabs } from '../components/InstallTabs';

const sidebarItems = [
  { to: '/docs', label: 'Introduction', end: true },
  { to: '/docs/installation', label: 'Installation' },
  { to: '/docs/quick-start', label: 'Quick Start' },
  { to: '/docs/cli', label: 'CLI Usage' },
  { to: '/docs/output-formats', label: 'Output Formats' },
  { to: '/docs/ai-enrichment', label: 'AI Enrichment' },
];

function Sidebar() {
  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <nav className="sticky top-20 space-y-1">
        {sidebarItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              clsx(
                'block px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Introduction() {
  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>Introduction</h1>
      <p className="lead">
        <code>@oxog/npm-llms</code> extracts LLM-optimized documentation from any NPM package.
        It generates llms.txt files that AI coding assistants can use to understand APIs.
      </p>

      <h2>What is llms.txt?</h2>
      <p>
        The <a href="https://llmstxt.org">llms.txt specification</a> defines a standard format
        for providing context to Large Language Models. It's a concise, token-efficient way to
        describe APIs and libraries.
      </p>

      <h2>Key Features</h2>
      <ul>
        <li><strong>Zero Dependencies</strong> - Uses only Node.js built-in modules</li>
        <li><strong>TypeScript Support</strong> - Parses .d.ts files for accurate type info</li>
        <li><strong>Multiple Formats</strong> - llms.txt, Markdown, JSON, HTML output</li>
        <li><strong>AI Enrichment</strong> - Optional AI-powered documentation enhancement</li>
        <li><strong>Plugin System</strong> - Extensible micro-kernel architecture</li>
        <li><strong>Caching</strong> - Smart caching for repeated extractions</li>
      </ul>

      <h2>Use Cases</h2>
      <ul>
        <li>Generate documentation for AI coding assistants (Cursor, Copilot, Claude)</li>
        <li>Create API references for your project dependencies</li>
        <li>Build documentation sites from package metadata</li>
        <li>Batch extract docs for multiple packages</li>
      </ul>
    </article>
  );
}

function Installation() {
  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>Installation</h1>
      <p>Install the package using your preferred package manager:</p>
      <div className="not-prose my-6">
        <InstallTabs />
      </div>

      <h2>Requirements</h2>
      <ul>
        <li>Node.js 18.0.0 or higher</li>
        <li>No additional dependencies required</li>
      </ul>

      <h2>Global Installation (for CLI)</h2>
      <p>To use the CLI globally:</p>
      <div className="not-prose my-4">
        <CodeBlock code="npm install -g @oxog/npm-llms" language="bash" />
      </div>
    </article>
  );
}

function QuickStart() {
  const basicExample = `import { extract } from '@oxog/npm-llms';

// Extract documentation
const result = await extract('zod');

// Access the outputs
console.log(result.outputs['llms']);      // llms.txt content
console.log(result.outputs['llms-full']); // Full documentation
console.log(result.api.length);           // Number of API entries`;

  const configuredExample = `import { createExtractor } from '@oxog/npm-llms';

const extractor = createExtractor({
  cache: {
    enabled: true,
    dir: '.npm-llms-cache',
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  verbose: true,
});

const result = await extractor.extract('lodash', {
  formats: ['llms', 'markdown', 'json'],
  llmsTokenLimit: 2000,
  prioritize: ['functions', 'examples'],
});`;

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>Quick Start</h1>

      <h2>Basic Usage</h2>
      <p>The simplest way to extract documentation:</p>
      <div className="not-prose my-4">
        <CodeBlock code={basicExample} language="typescript" />
      </div>

      <h2>With Configuration</h2>
      <p>For more control, create a configured extractor:</p>
      <div className="not-prose my-4">
        <CodeBlock code={configuredExample} language="typescript" />
      </div>

      <h2>Result Object</h2>
      <p>The extraction result contains:</p>
      <ul>
        <li><code>package</code> - Package metadata (name, version, description)</li>
        <li><code>api</code> - Array of parsed API entries</li>
        <li><code>outputs</code> - Generated documentation by format</li>
        <li><code>tokenCount</code> - Token count for llms.txt</li>
        <li><code>truncated</code> - Whether content was truncated</li>
        <li><code>fromCache</code> - Whether result came from cache</li>
        <li><code>duration</code> - Extraction time in milliseconds</li>
      </ul>
    </article>
  );
}

function CLIUsage() {
  const commands = `# Extract llms.txt
npm-llms extract lodash --llms

# All formats
npm-llms extract zod --all -o ./docs

# Specific version
npm-llms extract express@4.18.0 --llms

# Print to stdout
npm-llms extract ms --llms --stdout

# Clear cache
npm-llms cache-clear`;

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>CLI Usage</h1>

      <h2>Basic Commands</h2>
      <div className="not-prose my-4">
        <CodeBlock code={commands} language="bash" />
      </div>

      <h2>Options</h2>
      <table>
        <thead>
          <tr>
            <th>Option</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>--llms</code></td>
            <td>Generate llms.txt</td>
          </tr>
          <tr>
            <td><code>--markdown</code></td>
            <td>Generate API.md</td>
          </tr>
          <tr>
            <td><code>--json</code></td>
            <td>Generate api.json</td>
          </tr>
          <tr>
            <td><code>--all</code></td>
            <td>Generate all formats</td>
          </tr>
          <tr>
            <td><code>-o, --output</code></td>
            <td>Output directory</td>
          </tr>
          <tr>
            <td><code>--stdout</code></td>
            <td>Print to stdout</td>
          </tr>
          <tr>
            <td><code>--tokens</code></td>
            <td>Token limit for llms.txt</td>
          </tr>
          <tr>
            <td><code>--ai</code></td>
            <td>AI provider (claude/openai/gemini/groq/ollama)</td>
          </tr>
        </tbody>
      </table>
    </article>
  );
}

function OutputFormats() {
  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>Output Formats</h1>

      <h2>llms.txt</h2>
      <p>
        Token-limited summary optimized for LLM context windows. Default limit is 2000 tokens.
        Prioritizes functions, examples, and key documentation.
      </p>

      <h2>llms-full.txt</h2>
      <p>
        Complete API documentation without token limits. Includes all functions, classes,
        interfaces, types, and examples.
      </p>

      <h2>Markdown (API.md)</h2>
      <p>
        Human-readable Markdown documentation with tables, code blocks, and proper formatting.
        Includes table of contents and parameter tables.
      </p>

      <h2>JSON (api.json)</h2>
      <p>
        Structured JSON for programmatic use. Contains all parsed API entries with full
        metadata including signatures, parameters, returns, and examples.
      </p>

      <h2>HTML</h2>
      <p>
        Standalone HTML documentation with dark mode support. Includes CSS styling and
        responsive design.
      </p>
    </article>
  );
}

function AIEnrichment() {
  const example = `import { createExtractor } from '@oxog/npm-llms';
import { createClaudePlugin } from '@oxog/npm-llms/plugins';

const extractor = createExtractor();

// Add AI enrichment
extractor.use(createClaudePlugin({
  model: 'claude-3-haiku-20240307',
}));

const result = await extractor.extract('lodash', {
  enrichWithAI: true,
  aiTasks: ['descriptions', 'examples'],
});`;

  return (
    <article className="prose dark:prose-invert max-w-none">
      <h1>AI Enrichment</h1>
      <p>
        Enhance extracted documentation with AI-generated descriptions, examples, and summaries.
      </p>

      <h2>Supported Providers</h2>
      <ul>
        <li><strong>Claude</strong> - Anthropic's Claude models</li>
        <li><strong>OpenAI</strong> - GPT-4o and GPT-4o-mini</li>
        <li><strong>Gemini</strong> - Google's Gemini models</li>
        <li><strong>Groq</strong> - Fast inference with Llama models</li>
        <li><strong>Ollama</strong> - Local models (no API key needed)</li>
      </ul>

      <h2>Example</h2>
      <div className="not-prose my-4">
        <CodeBlock code={example} language="typescript" />
      </div>

      <h2>Enrichment Tasks</h2>
      <ul>
        <li><code>descriptions</code> - Generate missing API descriptions</li>
        <li><code>examples</code> - Create usage examples</li>
        <li><code>summary</code> - Write package summary</li>
        <li><code>params</code> - Document parameters</li>
        <li><code>returns</code> - Document return values</li>
      </ul>
    </article>
  );
}

export function Docs() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex gap-12">
        <Sidebar />
        <div className="flex-1 min-w-0">
          <Routes>
            <Route index element={<Introduction />} />
            <Route path="installation" element={<Installation />} />
            <Route path="quick-start" element={<QuickStart />} />
            <Route path="cli" element={<CLIUsage />} />
            <Route path="output-formats" element={<OutputFormats />} />
            <Route path="ai-enrichment" element={<AIEnrichment />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
