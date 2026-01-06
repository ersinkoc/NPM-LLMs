import { Link } from 'react-router-dom';
import { ArrowRight, Package, Zap, Code2, Bot, Terminal, FileText, Shield, CheckCircle } from 'lucide-react';
import { InstallTabs } from '../components/InstallTabs';
import { CodeBlock } from '../components/CodeBlock';
import { GITHUB_REPO, DESCRIPTION } from '../lib/constants';

const features = [
  {
    icon: Package,
    title: 'Zero Dependencies',
    description: 'Pure Node.js built-ins only. No external runtime dependencies.',
  },
  {
    icon: Zap,
    title: 'Fast Extraction',
    description: 'Stream-based tar parsing with intelligent caching.',
  },
  {
    icon: Code2,
    title: 'TypeScript Native',
    description: 'Parses .d.ts files for accurate type information.',
  },
  {
    icon: Bot,
    title: 'AI Enrichment',
    description: 'Optional AI-powered description and example generation.',
  },
  {
    icon: Terminal,
    title: 'CLI & API',
    description: 'Use from command line or integrate into your code.',
  },
  {
    icon: FileText,
    title: 'Multiple Formats',
    description: 'llms.txt, llms-full.txt, Markdown, JSON, and HTML.',
  },
];

const quickStartCode = `import { extract } from '@oxog/npm-llms';

// Extract documentation for any NPM package
const result = await extract('zod');

console.log(result.outputs['llms']); // llms.txt content
console.log(result.api.length);      // API entries count`;

const cliExample = `# Generate llms.txt for a package
npm-llms extract lodash --llms

# All formats with custom output
npm-llms extract zod --all -o ./docs

# With AI enrichment
npm-llms extract express --llms --ai claude`;

const stats = [
  { label: 'Zero Dependencies', value: '0', icon: Package },
  { label: 'TypeScript', value: '100%', icon: Code2 },
  { label: 'Test Coverage', value: '95%+', icon: CheckCircle },
  { label: 'Bundle Size', value: '<50KB', icon: Shield },
];

export function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          {/* @oxog namespace badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-sm font-medium mb-6">
            <Package className="h-4 w-4" />
            <span className="font-mono">@oxog</span> • Zero runtime dependencies
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Extract LLM-optimized docs
            <br />
            <span className="text-primary-500">from any NPM package</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            {DESCRIPTION}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={`https://github.com/${GITHUB_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
            >
              View on GitHub
            </a>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-sm">
                <stat.icon className="h-4 w-4 text-primary-500" />
                <span className="font-semibold">{stat.value}</span>
                <span className="text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Quick Install</h2>
            <InstallTabs />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-xl border border-border bg-card hover:shadow-lg transition-shadow"
              >
                <feature.icon className="h-10 w-10 text-primary-500 mb-4" />
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Examples */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Quick Start</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-primary-500" />
                Programmatic API
              </h3>
              <CodeBlock code={quickStartCode} language="typescript" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary-500" />
                CLI Usage
              </h3>
              <CodeBlock code={cliExample} language="bash" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Extract documentation for your favorite packages in seconds.
          </p>
          <Link
            to="/docs"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            Read the Documentation
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
