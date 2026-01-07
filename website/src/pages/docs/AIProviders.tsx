import { Sidebar } from '@/components/layout/Sidebar';
import { CodeBlock } from '@/components/code/CodeBlock';
import { AI_PROVIDERS, OPENAI_COMPATIBLE_PROVIDERS } from '@/lib/constants';

const claudeExample = `import { extractPackageInfo } from '@oxog/npm-llms';
import { createClaudeProvider } from '@oxog/npm-llms/plugins/claude-ai';

const claude = createClaudeProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-haiku-4-5', // or claude-sonnet-4-5, claude-opus-4-5
});

const info = await extractPackageInfo('axios', {
  aiProvider: claude,
});`;

const openaiExample = `import { extractPackageInfo } from '@oxog/npm-llms';
import { createOpenAIProvider } from '@oxog/npm-llms/plugins/openai-ai';

const openai = createOpenAIProvider({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4.1-nano', // or gpt-4.1, gpt-4.1-mini, o3, o1
});

const info = await extractPackageInfo('express', {
  aiProvider: openai,
});`;

const geminiExample = `import { extractPackageInfo } from '@oxog/npm-llms';
import { createGeminiProvider } from '@oxog/npm-llms/plugins/gemini-ai';

const gemini = createGeminiProvider({
  apiKey: process.env.GOOGLE_API_KEY,
  model: 'gemini-3-flash-preview', // or gemini-2.5-pro, gemini-2.5-flash
});

const info = await extractPackageInfo('zod', {
  aiProvider: gemini,
});`;

const groqExample = `import { extractPackageInfo } from '@oxog/npm-llms';
import { createGroqProvider } from '@oxog/npm-llms/plugins/groq-ai';

const groq = createGroqProvider({
  apiKey: process.env.GROQ_API_KEY,
  model: 'llama-3.3-70b-versatile', // or llama-4-maverick, llama-4-scout
});

const info = await extractPackageInfo('fastify', {
  aiProvider: groq,
});`;

const ollamaExample = `import { extractPackageInfo } from '@oxog/npm-llms';
import { createOllamaProvider } from '@oxog/npm-llms/plugins/ollama-ai';

const ollama = createOllamaProvider({
  model: 'llama3.2', // any local model
  baseUrl: 'http://localhost:11434', // default Ollama URL
});

const info = await extractPackageInfo('prisma', {
  aiProvider: ollama,
});`;

const xaiExample = `import { createXAIProvider } from '@oxog/npm-llms/plugins/openai-ai';

const xai = createXAIProvider({
  apiKey: process.env.XAI_API_KEY,
  model: 'grok-3-mini-fast',
});`;

const customPresetExample = `import { createOpenAIProvider } from '@oxog/npm-llms/plugins/openai-ai';

// Use any OpenAI-compatible API
const custom = createOpenAIProvider({
  preset: 'custom',
  baseUrl: 'https://your-api.example.com/v1',
  apiKey: process.env.CUSTOM_API_KEY,
  model: 'your-model-name',
});`;

export function DocsAIProviders() {
  return (
    <div className="container py-12">
      <div className="flex gap-12">
        <Sidebar />

        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">AI Providers</h1>
          <p className="text-xl text-[var(--color-muted-foreground)] mb-8">
            Enhance documentation with AI-generated summaries and examples.
          </p>

          <div className="space-y-10">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Native Providers</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                npm-llms includes native plugins for major AI providers:
              </p>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 pr-4">Provider</th>
                      <th className="text-left py-3">Models</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--color-muted-foreground)]">
                    {AI_PROVIDERS.map((provider) => (
                      <tr key={provider.name} className="border-b border-[var(--color-border)]">
                        <td className="py-3 pr-4 font-medium">{provider.name}</td>
                        <td className="py-3">{provider.models}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Claude (Anthropic)</h2>
              <CodeBlock code={claudeExample} language="typescript" filename="claude-example.ts" />
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Environment variable: <code>ANTHROPIC_API_KEY</code>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">OpenAI</h2>
              <CodeBlock code={openaiExample} language="typescript" filename="openai-example.ts" />
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Environment variable: <code>OPENAI_API_KEY</code>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Gemini (Google)</h2>
              <CodeBlock code={geminiExample} language="typescript" filename="gemini-example.ts" />
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Environment variable: <code>GOOGLE_API_KEY</code>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Groq</h2>
              <CodeBlock code={groqExample} language="typescript" filename="groq-example.ts" />
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                Environment variable: <code>GROQ_API_KEY</code>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Ollama (Local)</h2>
              <CodeBlock code={ollamaExample} language="typescript" filename="ollama-example.ts" />
              <p className="mt-4 text-sm text-[var(--color-muted-foreground)]">
                No API key required. Runs locally.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">OpenAI-Compatible Providers</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Use any OpenAI-compatible API with built-in presets:
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {OPENAI_COMPATIBLE_PROVIDERS.map((provider) => (
                  <div
                    key={provider.name}
                    className="p-3 bg-[var(--color-muted)] rounded-lg border border-[var(--color-border)]"
                  >
                    <p className="font-medium text-sm">{provider.name}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                      {provider.envKey}
                    </p>
                  </div>
                ))}
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-3">x.ai (Grok) Example</h3>
              <CodeBlock code={xaiExample} language="typescript" filename="xai-example.ts" />

              <h3 className="text-xl font-semibold mt-6 mb-3">Custom Endpoint</h3>
              <CodeBlock code={customPresetExample} language="typescript" filename="custom-example.ts" />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Environment Variables</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Configure API keys via environment variables:
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left py-3 pr-4">Provider</th>
                      <th className="text-left py-3">Environment Variable</th>
                    </tr>
                  </thead>
                  <tbody className="text-[var(--color-muted-foreground)]">
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4">Claude</td>
                      <td className="py-3"><code>ANTHROPIC_API_KEY</code></td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4">OpenAI</td>
                      <td className="py-3"><code>OPENAI_API_KEY</code></td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4">Gemini</td>
                      <td className="py-3"><code>GOOGLE_API_KEY</code></td>
                    </tr>
                    <tr className="border-b border-[var(--color-border)]">
                      <td className="py-3 pr-4">Groq</td>
                      <td className="py-3"><code>GROQ_API_KEY</code></td>
                    </tr>
                    {OPENAI_COMPATIBLE_PROVIDERS.map((provider) => (
                      <tr key={provider.name} className="border-b border-[var(--color-border)]">
                        <td className="py-3 pr-4">{provider.name}</td>
                        <td className="py-3"><code>{provider.envKey}</code></td>
                      </tr>
                    ))}
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
