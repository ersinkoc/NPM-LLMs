import { CodeBlock } from '../components/CodeBlock';
import { Bot, FileText, Code2 } from 'lucide-react';

const plugins = [
  {
    category: 'AI Providers',
    icon: Bot,
    items: [
      {
        name: 'createClaudePlugin',
        description: 'Anthropic Claude AI enrichment',
        env: 'ANTHROPIC_API_KEY',
      },
      {
        name: 'createOpenAIPlugin',
        description: 'OpenAI GPT enrichment',
        env: 'OPENAI_API_KEY',
      },
      {
        name: 'createGeminiPlugin',
        description: 'Google Gemini enrichment',
        env: 'GOOGLE_API_KEY',
      },
      {
        name: 'createGroqPlugin',
        description: 'Groq fast inference',
        env: 'GROQ_API_KEY',
      },
      {
        name: 'createOllamaPlugin',
        description: 'Local Ollama models',
        env: 'None (local)',
      },
    ],
  },
  {
    category: 'Output Formats',
    icon: FileText,
    items: [
      {
        name: 'createHTMLOutputPlugin',
        description: 'Generate HTML documentation',
        env: 'None',
      },
    ],
  },
  {
    category: 'Parsers',
    icon: Code2,
    items: [
      {
        name: 'createChangelogParserPlugin',
        description: 'Parse CHANGELOG.md files',
        env: 'None',
      },
    ],
  },
];

const pluginExample = `import { definePlugin } from '@oxog/npm-llms';

const myPlugin = definePlugin({
  name: 'my-plugin',
  version: '1.0.0',
  category: 'output',  // 'parser' | 'output' | 'ai' | 'utility'
  dependencies: [],     // Other plugins this depends on

  install(kernel) {
    // Subscribe to events
    kernel.on('parse:complete', async (ctx) => {
      // Access parsed data
      console.log(\`Parsed \${ctx.api.length} entries\`);
    });

    kernel.on('output:generate', async (ctx) => {
      // Generate custom output
      ctx.outputs.set('custom', 'My custom output');
    });
  },

  onInit(ctx) {
    // Called after all plugins installed
  },

  onDestroy() {
    // Cleanup when unregistered
  },
});`;


export function Plugins() {
  return (
    <div className="container mx-auto px-4 py-12">
      <article className="prose dark:prose-invert max-w-4xl mx-auto">
        <h1>Plugins</h1>
        <p className="lead">
          Extend @oxog/npm-llms with optional plugins for AI enrichment, custom parsers,
          and additional output formats.
        </p>

        <h2>Available Plugins</h2>

        <div className="not-prose space-y-8 my-8">
          {plugins.map((category) => (
            <div key={category.category}>
              <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
                <category.icon className="h-5 w-5 text-primary-500" />
                {category.category}
              </h3>
              <div className="grid gap-4">
                {category.items.map((plugin) => (
                  <div
                    key={plugin.name}
                    className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <code className="text-primary-600 dark:text-primary-400 font-semibold">
                          {plugin.name}
                        </code>
                        <p className="text-sm text-muted-foreground mt-1">
                          {plugin.description}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-muted rounded">
                        {plugin.env}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2>Using Plugins</h2>
        <div className="not-prose my-4">
          <CodeBlock
            code={`import { createExtractor } from '@oxog/npm-llms';
import { createClaudePlugin } from '@oxog/npm-llms/plugins';

const extractor = createExtractor();
extractor.use(createClaudePlugin());

const result = await extractor.extract('lodash', {
  enrichWithAI: true,
});`}
            language="typescript"
          />
        </div>

        <h2>Creating Custom Plugins</h2>
        <p>Create your own plugins to extend functionality:</p>
        <div className="not-prose my-4">
          <CodeBlock code={pluginExample} language="typescript" filename="my-plugin.ts" />
        </div>

        <h2>Event System</h2>
        <p>
          Plugins subscribe to events emitted during extraction. Here are the available events:
        </p>

        <table>
          <thead>
            <tr>
              <th>Event</th>
              <th>Phase</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>parse:start</code></td>
              <td>Parse</td>
              <td>Before parsing begins</td>
            </tr>
            <tr>
              <td><code>parse:readme</code></td>
              <td>Parse</td>
              <td>README parsing</td>
            </tr>
            <tr>
              <td><code>parse:dts</code></td>
              <td>Parse</td>
              <td>TypeScript definitions</td>
            </tr>
            <tr>
              <td><code>parse:complete</code></td>
              <td>Parse</td>
              <td>After all parsing done</td>
            </tr>
            <tr>
              <td><code>output:generate</code></td>
              <td>Output</td>
              <td>Generate outputs</td>
            </tr>
            <tr>
              <td><code>ai:enrich</code></td>
              <td>AI</td>
              <td>AI enrichment step</td>
            </tr>
          </tbody>
        </table>

        <h2>Plugin Context</h2>
        <p>Event handlers receive the extraction context:</p>
        <div className="not-prose my-4">
          <CodeBlock
            code={`interface ExtractorContext {
  package: PackageInfo;       // Package metadata + files
  api: APIEntry[];            // Parsed API entries
  readme?: ParsedReadme;      // Parsed README
  changelog?: ParsedChangelog;
  options: ExtractOptions;    // User options
  outputs: Map<string, string>; // Generated outputs
  tokenCount: number;
  truncated: boolean;
  errors: Error[];
}`}
            language="typescript"
          />
        </div>
      </article>
    </div>
  );
}
