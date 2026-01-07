export const PACKAGE_NAME = '@oxog/npm-llms';
export const PACKAGE_VERSION = '1.0.0';
export const GITHUB_URL = 'https://github.com/ersinkoc/npm-llms';
export const NPM_URL = 'https://www.npmjs.com/package/@oxog/npm-llms';
export const AUTHOR = 'Ersin Koc';
export const SITE_URL = 'https://npm-llms.oxog.dev';

export const FEATURES = [
  {
    title: 'Zero Dependencies',
    description: 'Lightweight and fast with no external runtime dependencies.',
    icon: 'Zap',
  },
  {
    title: 'Multiple Formats',
    description: 'Generate llms.txt, llms-full.txt, Markdown, and JSON outputs.',
    icon: 'FileText',
  },
  {
    title: 'AI Enrichment',
    description: 'Optional AI plugins for Claude, OpenAI, Gemini, Groq, and more.',
    icon: 'Sparkles',
  },
  {
    title: 'TypeScript Support',
    description: 'Full TypeScript support with .d.ts file parsing.',
    icon: 'Code2',
  },
  {
    title: 'Plugin System',
    description: 'Extensible micro-kernel architecture with event-based hooks.',
    icon: 'Puzzle',
  },
  {
    title: 'Smart Caching',
    description: 'Built-in file-based caching with configurable TTL.',
    icon: 'Database',
  },
] as const;

export const AI_PROVIDERS = [
  { name: 'Claude', models: 'claude-opus-4-5, claude-sonnet-4-5, claude-haiku-4-5' },
  { name: 'OpenAI', models: 'gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, o3, o1' },
  { name: 'Gemini', models: 'gemini-3-flash-preview, gemini-2.5-pro, gemini-2.5-flash' },
  { name: 'Groq', models: 'llama-3.3-70b-versatile, llama-4-maverick, llama-4-scout' },
  { name: 'Ollama', models: 'Any local model' },
] as const;

export const OPENAI_COMPATIBLE_PROVIDERS = [
  { name: 'x.ai (Grok)', envKey: 'XAI_API_KEY' },
  { name: 'z.ai (GLM)', envKey: 'ZAI_API_KEY' },
  { name: 'Together AI', envKey: 'TOGETHER_API_KEY' },
  { name: 'Perplexity', envKey: 'PERPLEXITY_API_KEY' },
  { name: 'OpenRouter', envKey: 'OPENROUTER_API_KEY' },
  { name: 'DeepSeek', envKey: 'DEEPSEEK_API_KEY' },
  { name: 'Mistral', envKey: 'MISTRAL_API_KEY' },
] as const;

export const NAV_ITEMS = [
  { label: 'Docs', href: '/docs' },
  { label: 'API', href: '/api' },
  { label: 'Examples', href: '/examples' },
] as const;

export const DOCS_SIDEBAR = [
  {
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/docs' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Quick Start', href: '/docs/quick-start' },
    ],
  },
  {
    title: 'CLI',
    items: [
      { label: 'Commands', href: '/docs/cli/commands' },
      { label: 'Options', href: '/docs/cli/options' },
    ],
  },
  {
    title: 'API',
    items: [
      { label: 'Overview', href: '/api' },
      { label: 'extractPackageInfo', href: '/api/extract-package-info' },
      { label: 'formatters', href: '/api/formatters' },
    ],
  },
  {
    title: 'Plugins',
    items: [
      { label: 'Overview', href: '/docs/plugins' },
      { label: 'AI Providers', href: '/docs/plugins/ai-providers' },
      { label: 'Custom Plugins', href: '/docs/plugins/custom' },
    ],
  },
] as const;
