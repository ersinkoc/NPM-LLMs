import { CodeBlock } from '../components/CodeBlock';

const extractSignature = `function extract(
  packageSpec: string,
  options?: ExtractOptions
): Promise<ExtractResult>`;

const createExtractorSignature = `function createExtractor(
  options?: ExtractorOptions
): Extractor`;

const extractorOptionsType = `interface ExtractorOptions {
  cache?: {
    enabled?: boolean;  // default: true
    dir?: string;       // default: '.npm-llms-cache'
    ttl?: number;       // default: 604800000 (7 days)
  };
  ai?: {
    provider: 'claude' | 'openai' | 'gemini' | 'ollama' | 'groq';
    apiKey?: string;
    model?: string;
    baseUrl?: string;
    timeout?: number;
  };
  plugins?: Plugin[];
  registry?: string;    // default: 'https://registry.npmjs.org'
  tempDir?: string;
  verbose?: boolean;
}`;

const extractOptionsType = `interface ExtractOptions {
  formats?: ('llms' | 'llms-full' | 'markdown' | 'json' | 'html')[];
  enrichWithAI?: boolean;
  aiTasks?: ('descriptions' | 'examples' | 'summary' | 'params' | 'returns')[];
  llmsTokenLimit?: number;  // default: 2000
  prioritize?: ('functions' | 'classes' | 'interfaces' | 'types' | 'examples' | 'readme')[];
  ignoreCache?: boolean;
}`;

const extractResultType = `interface ExtractResult {
  package: {
    name: string;
    version: string;
    description?: string;
  };
  api: APIEntry[];
  outputs: Record<string, string>;
  tokenCount: number;
  truncated: boolean;
  duration: number;
  fromCache: boolean;
}`;

const apiEntryType = `interface APIEntry {
  kind: 'function' | 'class' | 'interface' | 'type' | 'constant' | 'enum';
  name: string;
  signature: string;
  description?: string;
  params?: ParamDoc[];
  returns?: ReturnDoc;
  examples?: string[];
  deprecated?: string | boolean;
  since?: string;
  see?: string[];
}`;

export function API() {
  return (
    <div className="container mx-auto px-4 py-12">
      <article className="prose dark:prose-invert max-w-4xl mx-auto">
        <h1>API Reference</h1>

        <h2 id="extract">extract()</h2>
        <p>Quick extraction function that creates a temporary extractor.</p>
        <div className="not-prose my-4">
          <CodeBlock code={extractSignature} language="typescript" />
        </div>

        <h2 id="createExtractor">createExtractor()</h2>
        <p>Create a reusable extractor with configuration.</p>
        <div className="not-prose my-4">
          <CodeBlock code={createExtractorSignature} language="typescript" />
        </div>

        <h2 id="ExtractorOptions">ExtractorOptions</h2>
        <p>Configuration options for the extractor.</p>
        <div className="not-prose my-4">
          <CodeBlock code={extractorOptionsType} language="typescript" />
        </div>

        <h2 id="ExtractOptions">ExtractOptions</h2>
        <p>Options for individual extractions.</p>
        <div className="not-prose my-4">
          <CodeBlock code={extractOptionsType} language="typescript" />
        </div>

        <h2 id="ExtractResult">ExtractResult</h2>
        <p>Result returned from extraction.</p>
        <div className="not-prose my-4">
          <CodeBlock code={extractResultType} language="typescript" />
        </div>

        <h2 id="APIEntry">APIEntry</h2>
        <p>Parsed API entry structure.</p>
        <div className="not-prose my-4">
          <CodeBlock code={apiEntryType} language="typescript" />
        </div>

        <h2 id="error-codes">Error Codes</h2>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>PKG_NOT_FOUND</code></td>
              <td>Package doesn't exist in registry</td>
            </tr>
            <tr>
              <td><code>VERSION_NOT_FOUND</code></td>
              <td>Specified version doesn't exist</td>
            </tr>
            <tr>
              <td><code>DOWNLOAD_FAILED</code></td>
              <td>Network error downloading package</td>
            </tr>
            <tr>
              <td><code>PARSE_ERROR</code></td>
              <td>Failed to parse package contents</td>
            </tr>
            <tr>
              <td><code>CACHE_ERROR</code></td>
              <td>Cache read/write error</td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  );
}
