import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Terminal, Puzzle, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { PACKAGE_NAME } from '@/lib/constants';

const sections = [
  {
    title: 'Installation',
    description: 'Get started with npm-llms in your project.',
    href: '/docs/installation',
    icon: BookOpen,
  },
  {
    title: 'Quick Start',
    description: 'Learn the basics with a simple example.',
    href: '/docs/quick-start',
    icon: Terminal,
  },
  {
    title: 'CLI Commands',
    description: 'Reference for all CLI commands and options.',
    href: '/docs/cli/commands',
    icon: Terminal,
  },
  {
    title: 'Plugin System',
    description: 'Extend functionality with plugins.',
    href: '/docs/plugins',
    icon: Puzzle,
  },
  {
    title: 'AI Providers',
    description: 'Configure AI enrichment providers.',
    href: '/docs/plugins/ai-providers',
    icon: Sparkles,
  },
];

export function Docs() {
  return (
    <div className="container py-12">
      <div className="flex gap-12">
        <Sidebar />

        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Documentation</h1>
          <p className="text-xl text-[var(--color-muted-foreground)] mb-8">
            Learn how to use {PACKAGE_NAME} to extract NPM package documentation
            for LLMs and AI applications.
          </p>

          <div className="prose max-w-none">
            <h2 className="text-2xl font-semibold mt-8 mb-4">What is npm-llms?</h2>
            <p className="text-[var(--color-muted-foreground)] mb-4">
              npm-llms is a zero-dependency NPM package documentation extractor designed
              specifically for Large Language Models (LLMs). It generates documentation
              in formats optimized for AI consumption, including the llms.txt standard.
            </p>

            <h3 className="text-xl font-semibold mt-6 mb-3">Key Features</h3>
            <ul className="space-y-2 text-[var(--color-muted-foreground)] list-disc list-inside mb-8">
              <li>Extract documentation from any NPM package</li>
              <li>Generate llms.txt and llms-full.txt formats</li>
              <li>Parse TypeScript type definitions (.d.ts files)</li>
              <li>AI enrichment with Claude, OpenAI, Gemini, and more</li>
              <li>Plugin system for extensibility</li>
              <li>Built-in caching with configurable TTL</li>
            </ul>
          </div>

          <h2 className="text-2xl font-semibold mt-12 mb-6">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Link
                  key={section.href}
                  to={section.href}
                  className="group p-4 border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] hover:no-underline transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-[var(--color-muted)] flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    </div>
                    <div>
                      <h3 className="font-medium group-hover:text-[var(--color-primary)] flex items-center gap-2">
                        {section.title}
                        <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                        {section.description}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
