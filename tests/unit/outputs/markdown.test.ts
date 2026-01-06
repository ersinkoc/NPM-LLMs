/**
 * Tests for src/outputs/markdown.ts
 */

import { describe, it, expect } from 'vitest';
import { generateMarkdown } from '../../../src/outputs/markdown.js';
import type { ExtractorContext, APIEntry } from '../../../src/types.js';

// Helper to create a mock context
function createMockContext(overrides: Partial<ExtractorContext> = {}): ExtractorContext {
  return {
    package: {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package',
      tarball: 'https://example.com/test.tgz',
      files: new Map(),
      license: 'MIT',
      homepage: 'https://example.com',
      repository: { type: 'git', url: 'https://github.com/test/test' },
    },
    api: [],
    readme: undefined,
    changelog: undefined,
    options: {
      formats: ['markdown'],
      enrichWithAI: false,
      aiTasks: [],
      llmsTokenLimit: 2000,
      prioritize: ['functions'],
      ignoreCache: false,
    },
    outputs: new Map(),
    tokenCount: 0,
    truncated: false,
    startTime: Date.now(),
    fromCache: false,
    errors: [],
    ...overrides,
  };
}

function createMockFunction(name: string, options: Partial<APIEntry> = {}): APIEntry {
  return {
    kind: 'function',
    name,
    signature: `function ${name}(arg: string): void`,
    description: 'A test function',
    params: [{ name: 'arg', type: 'string', description: 'An argument' }],
    returns: { type: 'void', description: 'Nothing' },
    examples: ['```ts\n' + name + '("test");\n```'],
    ...options,
  };
}

function createMockClass(name: string): APIEntry {
  return {
    kind: 'class',
    name,
    signature: `class ${name}`,
    description: 'A test class',
    members: [
      { kind: 'method', name: 'doSomething', signature: 'doSomething(): void' },
    ],
  };
}

function createMockInterface(name: string): APIEntry {
  return {
    kind: 'interface',
    name,
    signature: `interface ${name} {\n  prop: string;\n}`,
    description: 'A test interface',
    members: [
      { kind: 'property', name: 'prop', signature: 'prop: string' },
    ],
  };
}

describe('generateMarkdown', () => {
  it('should generate markdown with package header', () => {
    const context = createMockContext();
    const result = generateMarkdown(context);

    expect(result).toContain('# test-package');
    expect(result).toContain('A test package');
  });

  it('should include table of contents', () => {
    const context = createMockContext({
      api: [createMockFunction('testFn')],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('## Table of Contents');
  });

  it('should include installation section', () => {
    const context = createMockContext();
    const result = generateMarkdown(context);

    expect(result).toContain('## Installation');
    expect(result).toContain('npm install test-package');
  });

  it('should include functions section', () => {
    const context = createMockContext({
      api: [createMockFunction('myFunction')],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('### Functions');
    expect(result).toContain('myFunction');
  });

  it('should include function signature', () => {
    const context = createMockContext({
      api: [createMockFunction('withSig')],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Signature:**');
    expect(result).toContain('function withSig');
  });

  it('should include classes section', () => {
    const context = createMockContext({
      api: [createMockClass('MyClass')],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('### Classes');
    expect(result).toContain('MyClass');
  });

  it('should include interfaces section', () => {
    const context = createMockContext({
      api: [createMockInterface('IConfig')],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('### Interfaces');
    expect(result).toContain('IConfig');
  });

  it('should include types section', () => {
    const context = createMockContext({
      api: [{
        kind: 'type',
        name: 'MyType',
        signature: 'type MyType = string | number',
        description: 'A union type',
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('### Types');
    expect(result).toContain('MyType');
  });

  it('should handle deprecated entries', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'oldFn',
        signature: 'function oldFn(): void',
        deprecated: 'Use newFn instead',
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('Deprecated');
    expect(result).toContain('Use newFn instead');
  });

  it('should handle empty API', () => {
    const context = createMockContext({ api: [] });
    const result = generateMarkdown(context);

    expect(result).toContain('# test-package');
    expect(result).not.toContain('### Functions');
  });

  it('should include badges with shields.io', () => {
    const context = createMockContext();
    const result = generateMarkdown(context);

    expect(result).toContain('img.shields.io');
  });

  it('should handle multiple API entries', () => {
    const context = createMockContext({
      api: [
        createMockFunction('fn1'),
        createMockFunction('fn2'),
        createMockClass('Class1'),
        createMockInterface('Interface1'),
      ],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('fn1');
    expect(result).toContain('fn2');
    expect(result).toContain('Class1');
    expect(result).toContain('Interface1');
  });

  it('should include API Reference section', () => {
    const context = createMockContext({
      api: [createMockFunction('test')],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('## API Reference');
  });
});
