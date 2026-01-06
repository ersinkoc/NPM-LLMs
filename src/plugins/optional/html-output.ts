/**
 * HTML output plugin for @oxog/npm-llms
 * Generates HTML documentation from API entries
 * @module plugins/optional/html-output
 */

import type {
  Plugin,
  ExtractorContext,
  Kernel,
  APIEntry,
  ParsedReadme,
} from '../../types.js';
import { definePlugin } from '../../kernel.js';

/**
 * HTML output options
 */
export interface HTMLOutputOptions {
  /** Page title (uses package name if not provided) */
  title?: string;
  /** Include inline styles */
  includeStyles?: boolean;
  /** Include syntax highlighting CSS classes */
  syntaxHighlighting?: boolean;
  /** Dark mode support */
  darkMode?: boolean;
  /** Custom CSS to inject */
  customCSS?: string;
}

const DEFAULT_OPTIONS: HTMLOutputOptions = {
  includeStyles: true,
  syntaxHighlighting: true,
  darkMode: true,
};

/**
 * Escape HTML special characters
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate CSS styles
 * @param options - HTML options
 * @returns CSS string
 */
function generateStyles(options: HTMLOutputOptions): string {
  if (!options.includeStyles) return '';

  let css = `
    :root {
      --bg: #ffffff;
      --text: #1a1a1a;
      --code-bg: #f5f5f5;
      --border: #e5e5e5;
      --link: #0066cc;
      --heading: #000000;
      --param-type: #0550ae;
      --deprecated: #d93025;
    }
    ${options.darkMode ? `
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --text: #e5e5e5;
        --code-bg: #2d2d2d;
        --border: #404040;
        --link: #58a6ff;
        --heading: #ffffff;
        --param-type: #79c0ff;
        --deprecated: #f85149;
      }
    }` : ''}
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--text);
      background: var(--bg);
      max-width: 900px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1, h2, h3, h4 { color: var(--heading); margin-top: 2rem; }
    h1 { border-bottom: 2px solid var(--border); padding-bottom: 0.5rem; }
    code {
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 0.9em;
      background: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 3px;
    }
    pre {
      background: var(--code-bg);
      padding: 1rem;
      overflow-x: auto;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    pre code { background: none; padding: 0; }
    a { color: var(--link); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .api-entry {
      margin: 2rem 0;
      padding: 1.5rem;
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .api-entry h3 { margin-top: 0; }
    .signature { font-size: 0.95rem; }
    .param-type { color: var(--param-type); }
    .deprecated { color: var(--deprecated); font-style: italic; }
    .params-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    .params-table th, .params-table td {
      text-align: left;
      padding: 0.5rem;
      border-bottom: 1px solid var(--border);
    }
    .params-table th { font-weight: 600; }
    .toc { background: var(--code-bg); padding: 1rem; border-radius: 6px; }
    .toc ul { margin: 0; padding-left: 1.5rem; }
    .badge {
      display: inline-block;
      padding: 0.2em 0.5em;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 4px;
      margin-left: 0.5rem;
    }
    .badge-function { background: #ddf4ff; color: #0550ae; }
    .badge-class { background: #fff8c5; color: #735c0f; }
    .badge-interface { background: #dafbe1; color: #116329; }
    .badge-type { background: #f6e8ff; color: #8250df; }
    .badge-constant { background: #ffebe9; color: #cf222e; }
    .badge-enum { background: #fdf4ff; color: #bf3989; }
  `;

  if (options.customCSS) {
    css += options.customCSS;
  }

  return `<style>${css}</style>`;
}

/**
 * Generate kind badge
 * @param kind - API entry kind
 * @returns Badge HTML
 */
function kindBadge(kind: string): string {
  return `<span class="badge badge-${kind}">${kind}</span>`;
}

/**
 * Generate table of contents
 * @param entries - API entries
 * @returns TOC HTML
 */
function generateTOC(entries: APIEntry[]): string {
  if (entries.length === 0) return '';

  const grouped = new Map<string, APIEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.kind) || [];
    list.push(entry);
    grouped.set(entry.kind, list);
  }

  let html = '<nav class="toc"><h2>Table of Contents</h2>';

  for (const [kind, items] of grouped) {
    html += `<h4>${kind.charAt(0).toUpperCase() + kind.slice(1)}s</h4><ul>`;
    for (const item of items) {
      const id = `${kind}-${item.name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
      html += `<li><a href="#${id}">${escapeHTML(item.name)}</a></li>`;
    }
    html += '</ul>';
  }

  html += '</nav>';
  return html;
}

/**
 * Generate parameters table
 * @param entry - API entry
 * @returns Parameters HTML
 */
function generateParams(entry: APIEntry): string {
  if (!entry.params || entry.params.length === 0) return '';

  let html = '<h4>Parameters</h4><table class="params-table"><thead><tr>';
  html += '<th>Name</th><th>Type</th><th>Description</th></tr></thead><tbody>';

  for (const param of entry.params) {
    const name = param.optional ? `${param.name}?` : param.name;
    const type = param.type ? `<code class="param-type">${escapeHTML(param.type)}</code>` : '-';
    const desc = param.description ? escapeHTML(param.description) : '-';
    html += `<tr><td><code>${escapeHTML(name)}</code></td><td>${type}</td><td>${desc}</td></tr>`;
  }

  html += '</tbody></table>';
  return html;
}

/**
 * Generate examples section
 * @param examples - Examples array
 * @returns Examples HTML
 */
function generateExamples(examples: string[]): string {
  if (examples.length === 0) return '';

  let html = '<h4>Examples</h4>';
  for (const example of examples) {
    html += `<pre><code>${escapeHTML(example)}</code></pre>`;
  }
  return html;
}

/**
 * Generate single API entry HTML
 * @param entry - API entry
 * @returns Entry HTML
 */
function generateEntry(entry: APIEntry): string {
  const id = `${entry.kind}-${entry.name}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  let html = `<div class="api-entry" id="${id}">`;
  html += `<h3>${escapeHTML(entry.name)} ${kindBadge(entry.kind)}</h3>`;

  if (entry.deprecated) {
    const reason = typeof entry.deprecated === 'string' ? entry.deprecated : '';
    html += `<p class="deprecated">Deprecated${reason ? `: ${escapeHTML(reason)}` : ''}</p>`;
  }

  if (entry.description) {
    html += `<p>${escapeHTML(entry.description)}</p>`;
  }

  html += `<pre class="signature"><code>${escapeHTML(entry.signature)}</code></pre>`;

  html += generateParams(entry);

  if (entry.returns) {
    html += '<h4>Returns</h4>';
    html += `<p><code class="param-type">${escapeHTML(entry.returns.type)}</code>`;
    if (entry.returns.description) {
      html += ` - ${escapeHTML(entry.returns.description)}`;
    }
    html += '</p>';
  }

  if (entry.examples && entry.examples.length > 0) {
    html += generateExamples(entry.examples);
  }

  html += '</div>';
  return html;
}

/**
 * Generate header section
 * @param name - Package name
 * @param version - Package version
 * @param description - Package description
 * @param readme - Parsed readme
 * @returns Header HTML
 */
function generateHeader(
  name: string,
  version: string,
  description?: string,
  readme?: ParsedReadme
): string {
  let html = `<header>`;
  html += `<h1>${escapeHTML(name)} <small>v${escapeHTML(version)}</small></h1>`;

  if (description) {
    html += `<p>${escapeHTML(description)}</p>`;
  }

  if (readme?.installation) {
    html += '<h2>Installation</h2>';
    html += `<pre><code>${escapeHTML(readme.installation)}</code></pre>`;
  }

  html += '</header>';
  return html;
}

/**
 * Generate full HTML document
 * @param ctx - Extractor context
 * @param options - HTML options
 * @returns HTML string
 */
export function generateHTML(ctx: ExtractorContext, options: HTMLOutputOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const title = opts.title || `${ctx.package.name} API Documentation`;

  let html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += `<title>${escapeHTML(title)}</title>\n`;
  html += generateStyles(opts);
  html += '</head>\n<body>\n';

  html += generateHeader(ctx.package.name, ctx.package.version, ctx.package.description, ctx.readme);

  html += generateTOC(ctx.api);

  html += '<main>';

  // Group entries by kind
  const grouped = new Map<string, APIEntry[]>();
  for (const entry of ctx.api) {
    const list = grouped.get(entry.kind) || [];
    list.push(entry);
    grouped.set(entry.kind, list);
  }

  // Render each group
  const kindOrder = ['function', 'class', 'interface', 'type', 'constant', 'enum'];
  for (const kind of kindOrder) {
    const entries = grouped.get(kind);
    if (!entries || entries.length === 0) continue;

    html += `<section><h2>${kind.charAt(0).toUpperCase() + kind.slice(1)}s</h2>`;
    for (const entry of entries) {
      html += generateEntry(entry);
    }
    html += '</section>';
  }

  html += '</main>\n';

  // Footer
  html += '<footer><p>Generated by <a href="https://github.com/oxog/npm-llms">@oxog/npm-llms</a></p></footer>\n';

  html += '</body>\n</html>';

  return html;
}

/**
 * Create HTML output plugin
 * @param options - HTML options
 * @returns HTML output plugin
 */
export function createHTMLOutputPlugin(options: HTMLOutputOptions = {}): Plugin {
  return definePlugin({
    name: 'html-output',
    version: '1.0.0',
    category: 'output',

    install(kernel: Kernel<ExtractorContext>) {
      kernel.on('output:generate', async (ctx: ExtractorContext) => {
        // Only generate if html format is requested
        if (!ctx.options.formats?.includes('html')) return;

        const html = generateHTML(ctx, options);
        ctx.outputs.set('html', html);
      });
    },
  });
}
