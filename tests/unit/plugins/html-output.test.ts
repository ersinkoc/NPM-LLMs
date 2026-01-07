/**
 * HTML Output Plugin Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  generateHTML,
  createHTMLOutputPlugin,
} from '../../../src/plugins/optional/html-output.js';
import type { ExtractorContext, APIEntry } from '../../../src/types.js';

// Helper to create a minimal context
function createMockContext(overrides: Partial<ExtractorContext> = {}): ExtractorContext {
  return {
    package: {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package',
      tarball: 'http://test.com/test.tgz',
      files: new Map(),
      ...overrides.package,
    },
    api: overrides.api || [],
    readme: overrides.readme,
    changelog: overrides.changelog,
    options: overrides.options || { formats: ['html'] },
    outputs: overrides.outputs || new Map(),
    tokenCount: 0,
    truncated: false,
    startTime: Date.now(),
    fromCache: false,
    errors: [],
    ...overrides,
  };
}

describe('generateHTML', () => {
  describe('basic structure', () => {
    it('should generate valid HTML document', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html lang="en">');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('should include meta tags', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('<meta charset="UTF-8">');
      expect(html).toContain('<meta name="viewport"');
    });

    it('should include package name in title', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('<title>test-package API Documentation</title>');
    });

    it('should use custom title when provided', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx, { title: 'Custom Title' });

      expect(html).toContain('<title>Custom Title</title>');
    });

    it('should include package version in header', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('v1.0.0');
    });

    it('should include package description', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('A test package');
    });

    it('should include footer with generator link', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('<footer>');
      expect(html).toContain('@oxog/npm-llms');
    });
  });

  describe('styles', () => {
    it('should include styles by default', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('<style>');
      expect(html).toContain('--bg:');
      expect(html).toContain('--text:');
    });

    it('should include dark mode styles by default', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx);

      expect(html).toContain('@media (prefers-color-scheme: dark)');
    });

    it('should exclude dark mode when disabled', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx, { darkMode: false });

      expect(html).not.toContain('@media (prefers-color-scheme: dark)');
    });

    it('should exclude styles when disabled', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx, { includeStyles: false });

      expect(html).not.toContain('<style>');
    });

    it('should include custom CSS when provided', () => {
      const ctx = createMockContext();
      const html = generateHTML(ctx, { customCSS: '.custom { color: red; }' });

      expect(html).toContain('.custom { color: red; }');
    });
  });

  describe('API entries', () => {
    it('should render function entries', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFunction',
            signature: 'function testFunction(): void',
            description: 'A test function',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('testFunction');
      expect(html).toContain('function');
      expect(html).toContain('A test function');
      expect(html).toContain('function testFunction(): void');
    });

    it('should render class entries', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'TestClass',
            signature: 'class TestClass',
            description: 'A test class',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('TestClass');
      expect(html).toContain('class');
      expect(html).toContain('A test class');
    });

    it('should render interface entries', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'interface',
            name: 'TestInterface',
            signature: 'interface TestInterface',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('TestInterface');
      expect(html).toContain('interface');
    });

    it('should render type entries', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'type',
            name: 'TestType',
            signature: 'type TestType = string',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('TestType');
      expect(html).toContain('type');
    });

    it('should render constant entries', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'constant',
            name: 'TEST_CONST',
            signature: 'const TEST_CONST = 42',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('TEST_CONST');
      expect(html).toContain('constant');
    });

    it('should render enum entries', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'enum',
            name: 'TestEnum',
            signature: 'enum TestEnum',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('TestEnum');
      expect(html).toContain('enum');
    });
  });

  describe('parameters', () => {
    it('should render parameter table', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(a: string, b?: number): void',
            params: [
              { name: 'a', type: 'string', description: 'First param' },
              { name: 'b', type: 'number', optional: true, description: 'Second param' },
            ],
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Parameters');
      expect(html).toContain('<table');
      expect(html).toContain('<code>a</code>');
      expect(html).toContain('<code>b?</code>');
      expect(html).toContain('string');
      expect(html).toContain('number');
      expect(html).toContain('First param');
    });

    it('should handle params without description', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(a: string): void',
            params: [{ name: 'a', type: 'string' }],
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('<td>-</td>');
    });

    it('should handle params without type', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(a): void',
            params: [{ name: 'a' }],
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('<td>-</td>');
    });
  });

  describe('returns', () => {
    it('should render return type', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(): string',
            returns: { type: 'string', description: 'The result' },
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Returns');
      expect(html).toContain('string');
      expect(html).toContain('The result');
    });

    it('should render return type without description', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(): void',
            returns: { type: 'void' },
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Returns');
      expect(html).toContain('void');
    });
  });

  describe('examples', () => {
    it('should render examples', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(): void',
            examples: ['testFn()'],
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Examples');
      expect(html).toContain('testFn()');
    });

    it('should not render examples section if empty', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(): void',
            examples: [],
          },
        ],
      });

      const html = generateHTML(ctx);

      // Should not have Examples heading
      expect(html).not.toContain('<h4>Examples</h4>');
    });
  });

  describe('deprecation', () => {
    it('should show deprecation notice', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'oldFn',
            signature: 'function oldFn(): void',
            deprecated: 'Use newFn instead',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Deprecated');
      expect(html).toContain('Use newFn instead');
    });

    it('should show deprecation without reason', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'oldFn',
            signature: 'function oldFn(): void',
            deprecated: true,
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Deprecated');
    });
  });

  describe('table of contents', () => {
    it('should generate TOC for entries', () => {
      const ctx = createMockContext({
        api: [
          { kind: 'function', name: 'fn1', signature: 'function fn1(): void' },
          { kind: 'function', name: 'fn2', signature: 'function fn2(): void' },
          { kind: 'class', name: 'Class1', signature: 'class Class1' },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Table of Contents');
      expect(html).toContain('href="#function-fn1"');
      expect(html).toContain('href="#function-fn2"');
      expect(html).toContain('href="#class-class1"');
    });

    it('should not render TOC for empty API', () => {
      const ctx = createMockContext({ api: [] });
      const html = generateHTML(ctx);

      expect(html).not.toContain('Table of Contents');
    });
  });

  describe('readme integration', () => {
    it('should include installation from readme', () => {
      const ctx = createMockContext({
        readme: {
          installation: 'npm install test-package',
          sections: [],
        },
      });

      const html = generateHTML(ctx);

      expect(html).toContain('Installation');
      expect(html).toContain('npm install test-package');
    });
  });

  describe('HTML escaping', () => {
    it('should escape HTML in description', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(): void',
            description: 'Returns <div> element & stuff',
          },
        ],
      });

      const html = generateHTML(ctx);

      expect(html).toContain('&lt;div&gt;');
      expect(html).toContain('&amp;');
    });

    it('should escape HTML in name', () => {
      const ctx = createMockContext({
        package: {
          name: 'pkg<script>',
          version: '1.0.0',
          tarball: 'http://test.com/test.tgz',
          files: new Map(),
        },
      });

      const html = generateHTML(ctx);

      expect(html).toContain('pkg&lt;script&gt;');
    });
  });
});

describe('createHTMLOutputPlugin', () => {
  it('should create a valid plugin', () => {
    const plugin = createHTMLOutputPlugin();

    expect(plugin.name).toBe('html-output');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('output');
    expect(typeof plugin.install).toBe('function');
  });

  it('should register output:generate handler', () => {
    const plugin = createHTMLOutputPlugin();
    const handlers: Record<string, Function> = {};

    const mockKernel = {
      on: vi.fn((event: string, handler: Function) => {
        handlers[event] = handler;
      }),
    };

    plugin.install(mockKernel as any);

    expect(mockKernel.on).toHaveBeenCalledWith('output:generate', expect.any(Function));
  });

  it('should generate HTML when html format is requested', async () => {
    const plugin = createHTMLOutputPlugin();
    let handler: Function | undefined;

    const mockKernel = {
      on: vi.fn((event: string, h: Function) => {
        if (event === 'output:generate') {
          handler = h;
        }
      }),
    };

    plugin.install(mockKernel as any);

    const ctx = createMockContext({
      options: { formats: ['html'] },
    });

    await handler!(ctx);

    expect(ctx.outputs.has('html')).toBe(true);
    expect(ctx.outputs.get('html')).toContain('<!DOCTYPE html>');
  });

  it('should not generate HTML when html format is not requested', async () => {
    const plugin = createHTMLOutputPlugin();
    let handler: Function | undefined;

    const mockKernel = {
      on: vi.fn((event: string, h: Function) => {
        if (event === 'output:generate') {
          handler = h;
        }
      }),
    };

    plugin.install(mockKernel as any);

    const ctx = createMockContext({
      options: { formats: ['json', 'markdown'] },
    });

    await handler!(ctx);

    expect(ctx.outputs.has('html')).toBe(false);
  });

  it('should pass options to generateHTML', async () => {
    const plugin = createHTMLOutputPlugin({ title: 'Custom Title', darkMode: false });
    let handler: Function | undefined;

    const mockKernel = {
      on: vi.fn((event: string, h: Function) => {
        if (event === 'output:generate') {
          handler = h;
        }
      }),
    };

    plugin.install(mockKernel as any);

    const ctx = createMockContext({
      options: { formats: ['html'] },
    });

    await handler!(ctx);

    expect(ctx.outputs.get('html')).toContain('Custom Title');
    expect(ctx.outputs.get('html')).not.toContain('@media (prefers-color-scheme: dark)');
  });
});
