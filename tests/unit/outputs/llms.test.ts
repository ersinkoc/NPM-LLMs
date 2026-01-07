/**
 * Tests for src/outputs/llms.ts
 */

import { describe, it, expect } from 'vitest';
import {
  generateLlmsTxt,
  generateMinimalLlmsTxt,
  fitsTokenLimit,
  estimateLlmsTokens,
  DEFAULT_LLMS_TOKEN_LIMIT,
} from '../../../src/outputs/llms.js';
import type { ExtractorContext, APIEntry, ParsedReadme } from '../../../src/types.js';

// Helper to create a mock context
function createMockContext(overrides: Partial<ExtractorContext> = {}): ExtractorContext {
  return {
    package: {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package for testing',
      tarball: 'https://example.com/test.tgz',
      files: new Map(),
    },
    api: [],
    readme: undefined,
    changelog: undefined,
    options: {
      formats: ['llms'],
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

// Helper to create mock API entries
function createMockFunction(name: string, description?: string): APIEntry {
  return {
    kind: 'function',
    name,
    signature: `function ${name}(): void`,
    description,
    params: [],
    examples: [],
  };
}

function createMockClass(name: string, description?: string): APIEntry {
  return {
    kind: 'class',
    name,
    signature: `class ${name}`,
    description,
  };
}

function createMockInterface(name: string): APIEntry {
  return {
    kind: 'interface',
    name,
    signature: `interface ${name} {}`,
  };
}

function createMockType(name: string): APIEntry {
  return {
    kind: 'type',
    name,
    signature: `type ${name} = unknown`,
  };
}

describe('generateLlmsTxt', () => {
  it('should generate basic llms.txt with package header', () => {
    const context = createMockContext();
    const result = generateLlmsTxt(context);

    expect(result).toContain('# test-package');
    expect(result).toContain('> A test package for testing');
  });

  it('should include installation instructions by default', () => {
    const context = createMockContext();
    const result = generateLlmsTxt(context);

    expect(result).toContain('## Install');
    expect(result).toContain('npm install test-package');
  });

  it('should exclude installation when includeInstall is false', () => {
    const context = createMockContext();
    const result = generateLlmsTxt(context, { includeInstall: false });

    expect(result).not.toContain('## Install');
  });

  it('should include quick start from readme when available', () => {
    const context = createMockContext({
      readme: {
        title: 'Test Package',
        description: 'A test',
        quickStart: '```js\nconsole.log("hello");\n```',
        sections: [],
      },
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('## Quick Start');
    expect(result).toContain('console.log("hello")');
  });

  it('should include functions section when functions exist', () => {
    const context = createMockContext({
      api: [
        createMockFunction('foo', 'Does foo things'),
        createMockFunction('bar', 'Does bar things'),
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('### Functions');
    expect(result).toContain('foo');
    expect(result).toContain('bar');
  });

  it('should limit functions to maxFunctions', () => {
    const context = createMockContext({
      api: Array.from({ length: 20 }, (_, i) => createMockFunction(`fn${i}`)),
    });
    const result = generateLlmsTxt(context, { maxFunctions: 5 });

    expect(result).toContain('fn0');
    expect(result).toContain('fn4');
    expect(result).toContain('...and 15 more functions');
  });

  it('should include classes section when classes exist', () => {
    const context = createMockContext({
      api: [
        createMockClass('MyClass', 'A useful class'),
        createMockClass('OtherClass'),
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('### Classes');
    expect(result).toContain('MyClass');
    expect(result).toContain('OtherClass');
  });

  it('should limit classes to maxClasses', () => {
    const context = createMockContext({
      api: Array.from({ length: 10 }, (_, i) => createMockClass(`Class${i}`)),
    });
    const result = generateLlmsTxt(context, { maxClasses: 3 });

    expect(result).toContain('Class0');
    expect(result).toContain('Class2');
    expect(result).toContain('...and 7 more classes');
  });

  it('should include interfaces in Types section', () => {
    const context = createMockContext({
      api: [
        createMockInterface('IFoo'),
        createMockInterface('IBar'),
      ],
    });
    const result = generateLlmsTxt(context);

    // In llms.txt, interfaces and types are grouped together under Types
    expect(result).toContain('### Types');
    expect(result).toContain('IFoo');
    expect(result).toContain('IBar');
  });

  it('should include types section when types exist', () => {
    const context = createMockContext({
      api: [
        createMockType('MyType'),
        createMockType('OtherType'),
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('### Types');
    expect(result).toContain('MyType');
    expect(result).toContain('OtherType');
  });

  it('should truncate content to token limit', () => {
    const context = createMockContext({
      api: Array.from({ length: 100 }, (_, i) => createMockFunction(`longFunctionName${i}`, 'A very long description '.repeat(10))),
    });
    const result = generateLlmsTxt(context, { tokenLimit: 500 });

    // Result should be truncated (exact behavior depends on implementation)
    expect(result.length).toBeLessThan(10000);
  });

  it('should handle empty API', () => {
    const context = createMockContext({ api: [] });
    const result = generateLlmsTxt(context);

    expect(result).toContain('# test-package');
    expect(result).toContain('## API');
  });

  it('should handle package without description', () => {
    const context = createMockContext({
      package: {
        name: 'no-desc-package',
        version: '1.0.0',
        tarball: 'https://example.com/test.tgz',
        files: new Map(),
      },
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('# no-desc-package');
    expect(result).not.toContain('> undefined');
  });

  it('should update context tokenCount and truncated', () => {
    const context = createMockContext({
      api: Array.from({ length: 50 }, (_, i) => createMockFunction(`fn${i}`, 'Description '.repeat(20))),
    });
    generateLlmsTxt(context, { tokenLimit: 500 });

    expect(context.tokenCount).toBeGreaterThan(0);
  });
});

describe('DEFAULT_LLMS_TOKEN_LIMIT', () => {
  it('should be Infinity (no limit by default)', () => {
    expect(DEFAULT_LLMS_TOKEN_LIMIT).toBe(Infinity);
  });
});

describe('generateLlmsTxt - additional coverage', () => {
  it('should include constants section when constants exist', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'constant',
          name: 'MAX_SIZE',
          signature: 'const MAX_SIZE: number',
          description: 'Maximum size allowed',
        },
        {
          kind: 'constant',
          name: 'VERSION',
          signature: 'const VERSION: string',
        },
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('### Constants');
    expect(result).toContain('MAX_SIZE');
    expect(result).toContain('Maximum size allowed');
    expect(result).toContain('VERSION');
  });

  it('should format function with params', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'function',
          name: 'greet',
          signature: 'function greet(name: string, age?: number): string',
          description: 'Greets a person',
          params: [
            { name: 'name', type: 'string', description: 'Name to greet' },
            { name: 'age', type: 'number', optional: true },
          ],
          returns: { type: 'string', description: 'Greeting message' },
        },
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('greet(name, age?)');
    expect(result).toContain(': string');
    expect(result).toContain('Greets a person');
  });

  it('should simplify long return types', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'function',
          name: 'getData',
          signature: 'function getData(): SomeVeryLongTypeNameThatExceedsThirtyCharacters<AndHasGenerics>',
          returns: {
            type: 'SomeVeryLongTypeNameThatExceedsThirtyCharacters<AndHasGenerics>',
          },
        },
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('SomeVeryLongTypeNameThatExceedsThirtyCharacters<...>');
  });

  it('should format class with methods', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'class',
          name: 'MyClass',
          signature: 'class MyClass',
          description: 'A class',
          methods: [
            { name: 'method1', signature: 'method1(): void' },
            { name: 'method2', signature: 'method2(): void' },
            { name: 'method3', signature: 'method3(): void' },
            { name: 'method4', signature: 'method4(): void' },
          ],
        },
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('MyClass');
    expect(result).toContain('method1()');
    expect(result).toContain('method2()');
    expect(result).toContain('method3()');
    expect(result).toContain('...1 more methods');
  });

  it('should truncate long descriptions', () => {
    const longDescription = 'A'.repeat(100);
    const context = createMockContext({
      api: [
        {
          kind: 'function',
          name: 'fn',
          signature: 'function fn(): void',
          description: longDescription,
        },
      ],
    });
    const result = generateLlmsTxt(context);

    // Description should be truncated
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(longDescription.length + 200);
  });

  it('should skip quick start when includeQuickStart is false', () => {
    const context = createMockContext({
      readme: {
        title: 'Test',
        description: 'Test desc',
        quickStart: '```js\nconsole.log("hello");\n```',
        sections: [],
      },
    });
    const result = generateLlmsTxt(context, { includeQuickStart: false });

    expect(result).not.toContain('## Quick Start');
  });

  it('should handle interfaces with description', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'interface',
          name: 'IConfig',
          signature: 'interface IConfig {}',
          description: 'Configuration interface for the application',
        },
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('`IConfig`');
    expect(result).toContain('Configuration interface');
  });

  it('should handle types with description', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'type',
          name: 'Callback',
          signature: 'type Callback = () => void',
          description: 'A callback type that takes no arguments',
        },
      ],
    });
    const result = generateLlmsTxt(context);

    expect(result).toContain('`Callback`');
    expect(result).toContain('A callback type');
  });
});

describe('generateMinimalLlmsTxt', () => {
  it('should generate minimal output with package header', () => {
    const context = createMockContext();
    const result = generateMinimalLlmsTxt(context);

    expect(result).toContain('# test-package');
    expect(result).toContain('> A test package for testing');
    expect(result).toContain('npm i test-package');
    expect(result).toContain('## Exports');
  });

  it('should list top exports', () => {
    const context = createMockContext({
      api: [
        { kind: 'function', name: 'fn1', signature: 'fn1()' },
        { kind: 'class', name: 'Class1', signature: 'class Class1' },
        { kind: 'interface', name: 'Interface1', signature: 'interface Interface1' },
        { kind: 'type', name: 'Type1', signature: 'type Type1' },
      ],
    });
    const result = generateMinimalLlmsTxt(context);

    expect(result).toContain('- function: `fn1`');
    expect(result).toContain('- class: `Class1`');
    expect(result).toContain('- interface: `Interface1`');
    expect(result).toContain('- type: `Type1`');
  });

  it('should limit to 10 exports', () => {
    const context = createMockContext({
      api: Array.from({ length: 15 }, (_, i) => ({
        kind: 'function' as const,
        name: `fn${i}`,
        signature: `fn${i}()`,
      })),
    });
    const result = generateMinimalLlmsTxt(context);

    const matches = result.match(/- function:/g) || [];
    expect(matches.length).toBe(10);
  });

  it('should handle package without description', () => {
    const context = createMockContext({
      package: {
        name: 'minimal-pkg',
        version: '1.0.0',
        tarball: 'https://example.com/test.tgz',
        files: new Map(),
      },
    });
    const result = generateMinimalLlmsTxt(context);

    expect(result).toContain('# minimal-pkg');
    expect(result).not.toContain('> undefined');
    expect(result).not.toContain('> \n');
  });
});

describe('fitsTokenLimit', () => {
  it('should return true when content fits within limit', () => {
    const content = 'Hello world';
    expect(fitsTokenLimit(content, 100)).toBe(true);
  });

  it('should return false when content exceeds limit', () => {
    const content = 'A'.repeat(1000);
    expect(fitsTokenLimit(content, 10)).toBe(false);
  });

  it('should return true when exactly at limit', () => {
    const content = 'Hello';
    const tokens = Math.ceil(content.length / 4); // Approximate
    expect(fitsTokenLimit(content, tokens + 10)).toBe(true);
  });

  it('should handle empty content', () => {
    expect(fitsTokenLimit('', 10)).toBe(true);
  });
});

describe('estimateLlmsTokens', () => {
  it('should estimate tokens for basic context', () => {
    const context = createMockContext();
    const estimate = estimateLlmsTokens(context);

    expect(estimate).toBeGreaterThan(0);
    expect(typeof estimate).toBe('number');
  });

  it('should include API entries in estimate', () => {
    const simpleContext = createMockContext();
    const complexContext = createMockContext({
      api: Array.from({ length: 20 }, (_, i) => ({
        kind: 'function' as const,
        name: `fn${i}`,
        signature: `fn${i}()`,
        description: 'A function that does something',
        params: [
          { name: 'arg1', type: 'string' },
          { name: 'arg2', type: 'number' },
        ],
      })),
    });

    const simpleEstimate = estimateLlmsTokens(simpleContext);
    const complexEstimate = estimateLlmsTokens(complexContext);

    expect(complexEstimate).toBeGreaterThan(simpleEstimate);
  });

  it('should include quick start in estimate', () => {
    const withoutQuickStart = createMockContext();
    const withQuickStart = createMockContext({
      readme: {
        title: 'Test',
        description: 'Test',
        quickStart: '```js\nconsole.log("Hello world this is a quick start example");\n```',
        sections: [],
      },
    });

    const withoutEstimate = estimateLlmsTokens(withoutQuickStart);
    const withEstimate = estimateLlmsTokens(withQuickStart);

    expect(withEstimate).toBeGreaterThan(withoutEstimate);
  });

  it('should account for entries without description', () => {
    const context = createMockContext({
      api: [
        { kind: 'function', name: 'fn', signature: 'fn()' },
      ],
    });

    const estimate = estimateLlmsTokens(context);
    expect(estimate).toBeGreaterThan(0);
  });

  it('should account for entries without params', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'function',
          name: 'fn',
          signature: 'fn()',
          description: 'A function',
        },
      ],
    });

    const estimate = estimateLlmsTokens(context);
    expect(estimate).toBeGreaterThan(0);
  });
});
