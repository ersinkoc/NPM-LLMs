import { Link } from 'react-router-dom';
import { ArrowRight, Terminal, Zap, FileText, Sparkles, Code2, Puzzle, Database, Check, Github, Package, Cpu } from 'lucide-react';
import { CodeBlock } from '@/components/code/CodeBlock';
import { PACKAGE_NAME, FEATURES, AI_PROVIDERS, OPENAI_COMPATIBLE_PROVIDERS, GITHUB_URL } from '@/lib/constants';

const iconMap = {
  Zap,
  FileText,
  Sparkles,
  Code2,
  Puzzle,
  Database,
};

const cliExample = `# Extract documentation for any npm package
npx @oxog/npm-llms extract lodash

# Generate all output formats
npx @oxog/npm-llms extract express --all

# Output to specific directory
npx @oxog/npm-llms extract react -o ./docs`;

const apiExample = `import { extractPackageInfo, formatAsLlmsTxt } from '@oxog/npm-llms';

// Extract package information
const info = await extractPackageInfo('lodash');

// Generate llms.txt format
const llmsTxt = formatAsLlmsTxt(info);
console.log(llmsTxt);`;

const aiEnrichmentExample = `import { extractPackageInfo } from '@oxog/npm-llms';
import { createClaudeProvider } from '@oxog/npm-llms/plugins/claude-ai';

// Create AI provider
const claude = createClaudeProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-haiku-4-5',
});

// Extract with AI enrichment
const info = await extractPackageInfo('axios', {
  aiProvider: claude,
});`;

export function Home() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-mesh" />
        <div className="absolute inset-0 bg-grid-pattern" />

        {/* Animated Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '0.5s' }} />

        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="badge badge-primary">
                <Sparkles className="w-3 h-3 mr-1" />
                v1.0 Released
              </span>
              <span className="badge badge-cyan">
                Zero Dependencies
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              NPM Package Docs
              <br />
              <span className="text-gradient">for LLMs</span>
            </h1>

            <p className="text-xl md:text-2xl text-[var(--color-muted-foreground)] mb-10 max-w-2xl mx-auto">
              Extract, transform, and enrich npm package documentation into AI-ready formats.
              Built for the age of AI assistants.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/docs"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-indigo-400 hover:no-underline transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
              >
                Get Started
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-foreground)] rounded-xl font-semibold hover:bg-[var(--color-muted)] hover:no-underline transition-all"
              >
                <Github className="h-5 w-5" />
                View on GitHub
              </a>
            </div>

            {/* Quick Install */}
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-[var(--color-card)] border border-[var(--color-border)]">
              <Terminal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <code className="text-sm font-mono">npm install {PACKAGE_NAME}</code>
            </div>
          </div>

          {/* Terminal Preview */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="gradient-border p-[1px] rounded-xl">
              <div className="bg-[var(--color-card)] rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <span className="text-sm font-mono text-[var(--color-muted-foreground)] ml-2">Terminal</span>
                </div>
                <CodeBlock code={cliExample} language="bash" showLineNumbers={false} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 border-y border-[var(--color-border)] bg-[var(--color-muted)]/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Output Formats', value: '4+', icon: FileText },
              { label: 'AI Providers', value: '5+', icon: Cpu },
              { label: 'Dependencies', value: '0', icon: Package },
              { label: 'TypeScript', value: '100%', icon: Code2 },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 mb-3">
                  <stat.icon className="w-6 h-6 text-[var(--color-primary)]" />
                </div>
                <div className="text-3xl font-bold text-gradient mb-1">{stat.value}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-dot-pattern opacity-50" />
        <div className="container relative">
          <div className="text-center mb-16">
            <span className="badge badge-purple mb-4">Features</span>
            <h2 className="text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-[var(--color-muted-foreground)] max-w-2xl mx-auto text-lg">
              A complete toolkit for generating AI-ready documentation from npm packages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => {
              const Icon = iconMap[feature.icon as keyof typeof iconMap];
              const colors = ['indigo', 'cyan', 'purple', 'emerald', 'pink', 'amber'];
              const color = colors[index % colors.length];

              return (
                <div
                  key={feature.title}
                  className="group p-6 bg-[var(--color-card)] rounded-xl border border-[var(--color-border)] card-hover"
                >
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors`}
                    style={{
                      backgroundColor: `rgba(var(--color-${color === 'indigo' ? 'primary' : color}), 0.1)`,
                    }}
                  >
                    <Icon className={`h-6 w-6 text-${color}-500`} style={{ color: `var(--color-${color === 'indigo' ? 'primary' : color})` }} />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-[var(--color-muted-foreground)]">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* API Example Section */}
      <section className="py-24 bg-[var(--color-muted)]/30">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="badge badge-cyan mb-4">Simple API</span>
              <h2 className="text-4xl font-bold mb-6">
                Powerful yet <span className="text-gradient">simple</span>
              </h2>
              <p className="text-[var(--color-muted-foreground)] mb-8 text-lg">
                Extract package information and format it for your specific needs with just a few lines of code.
                Full TypeScript support included.
              </p>
              <ul className="space-y-4">
                {[
                  'Extract from npm registry or local packages',
                  'Multiple output formats (llms.txt, Markdown, JSON)',
                  'Smart token truncation for context limits',
                  'TypeScript type definitions parsing',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-500" />
                    </div>
                    <span className="text-[var(--color-muted-foreground)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="gradient-border p-[1px] rounded-xl">
              <CodeBlock code={apiExample} language="typescript" filename="example.ts" />
            </div>
          </div>
        </div>
      </section>

      {/* AI Enrichment Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
        <div className="container relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="gradient-border p-[1px] rounded-xl">
                <CodeBlock code={aiEnrichmentExample} language="typescript" filename="ai-example.ts" />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="badge badge-purple mb-4">AI Enrichment</span>
              <h2 className="text-4xl font-bold mb-6">
                Supercharge with <span className="text-gradient">AI</span>
              </h2>
              <p className="text-[var(--color-muted-foreground)] mb-8 text-lg">
                Enhance documentation with AI-generated summaries, examples, and explanations.
                Support for multiple providers with easy configuration.
              </p>

              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    Native Providers
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {AI_PROVIDERS.map((provider) => (
                      <span
                        key={provider.name}
                        className="px-3 py-1.5 bg-[var(--color-card)] rounded-lg border border-[var(--color-border)] text-sm font-medium"
                      >
                        {provider.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    OpenAI-Compatible
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {OPENAI_COMPATIBLE_PROVIDERS.map((provider) => (
                      <span
                        key={provider.name}
                        className="px-2 py-1 bg-[var(--color-muted)] rounded text-xs text-[var(--color-muted-foreground)]"
                      >
                        {provider.name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
        <div className="container relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to <span className="text-gradient">get started?</span>
            </h2>
            <p className="text-xl text-[var(--color-muted-foreground)] mb-10">
              Install {PACKAGE_NAME} and start generating AI-ready documentation for your npm packages today.
            </p>

            <div className="gradient-border inline-block p-[1px] rounded-xl mb-10">
              <div className="bg-[var(--color-card)] rounded-xl px-6 py-4">
                <code className="text-lg font-mono">npm install {PACKAGE_NAME}</code>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/docs"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-xl font-semibold hover:from-indigo-500 hover:to-indigo-400 hover:no-underline transition-all shadow-lg shadow-indigo-500/25"
              >
                Read the Docs
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/docs/examples"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[var(--color-border)] rounded-xl font-semibold hover:bg-[var(--color-muted)] hover:no-underline transition-all"
              >
                View Examples
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
