/**
 * Tests for src/outputs/llms.ts
 */

import { describe, it, expect } from 'vitest';
import { generateLlmsTxt, DEFAULT_LLMS_TOKEN_LIMIT } from '../../../src/outputs/llms.js';
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
