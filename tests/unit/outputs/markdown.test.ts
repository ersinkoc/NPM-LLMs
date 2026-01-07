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

  it('should include quick start when available', () => {
    const context = createMockContext({
      readme: {
        title: 'Test',
        description: 'Test package',
        quickStart: '```js\nimport { test } from "test-package";\n```',
        sections: [],
      },
    });
    const result = generateMarkdown(context);

    expect(result).toContain('## Quick Start');
    expect(result).toContain('import { test }');
  });

  it('should exclude TOC when includeToc is false', () => {
    const context = createMockContext();
    const result = generateMarkdown(context, { includeToc: false });

    expect(result).not.toContain('## Table of Contents');
  });

  it('should exclude badges when includeBadges is false', () => {
    const context = createMockContext();
    const result = generateMarkdown(context, { includeBadges: false });

    expect(result).not.toContain('img.shields.io');
  });

  it('should include parameter tables by default', () => {
    const context = createMockContext({
      api: [createMockFunction('withParams', {
        params: [
          { name: 'name', type: 'string', description: 'The name' },
          { name: 'age', type: 'number', optional: true, defaultValue: '18' },
        ],
      })],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Parameters:**');
    expect(result).toContain('| Name | Type | Required | Description |');
    expect(result).toContain('`name`');
    expect(result).toContain('`string`');
    expect(result).toContain('Yes');
    expect(result).toContain('`age`');
    expect(result).toContain('No');
    expect(result).toContain('(default: `18`)');
  });

  it('should exclude parameter tables when includeParamTables is false', () => {
    const context = createMockContext({
      api: [createMockFunction('withParams')],
    });
    const result = generateMarkdown(context, { includeParamTables: false });

    expect(result).not.toContain('| Name | Type | Required |');
  });

  it('should include source link when repositoryUrl is provided', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'test',
        signature: 'function test(): void',
        sourceFile: 'src/index.ts',
        line: 42,
      }],
    });
    const result = generateMarkdown(context, {
      repositoryUrl: 'https://github.com/user/repo',
    });

    expect(result).toContain('[View source]');
    expect(result).toContain('https://github.com/user/repo/blob/main/src/index.ts#L42');
  });

  it('should format examples correctly', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'example',
        signature: 'function example(): void',
        examples: ['example("test");', '```typescript\nexample("advanced");\n```'],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Example:**');
    expect(result).toContain('example("test")');
    expect(result).toContain('example("advanced")');
  });

  it('should handle returns documentation', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'getData',
        signature: 'function getData(): string',
        returns: { type: 'string', description: 'The fetched data' },
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Returns:**');
    expect(result).toContain('`string`');
    expect(result).toContain('The fetched data');
  });

  it('should format class with extends and implements', () => {
    const context = createMockContext({
      api: [{
        kind: 'class',
        name: 'MyClass',
        signature: 'class MyClass extends BaseClass implements IService, ILogger',
        description: 'A class that extends and implements',
        extends: ['BaseClass'],
        implements: ['IService', 'ILogger'],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Extends:** `BaseClass`');
    expect(result).toContain('**Implements:** `IService`, `ILogger`');
  });

  it('should format class with constructor', () => {
    const context = createMockContext({
      api: [{
        kind: 'class',
        name: 'MyClass',
        signature: 'class MyClass',
        methods: [
          {
            name: 'constructor',
            signature: 'constructor(name: string, age: number)',
            params: [
              { name: 'name', type: 'string' },
              { name: 'age', type: 'number' },
            ],
          },
          { name: 'doSomething', signature: 'doSomething(): void' },
        ],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Constructor:**');
    expect(result).toContain('new MyClass(name: string, age: number)');
    expect(result).toContain('**Methods:**');
    expect(result).toContain('doSomething()');
  });

  it('should format class with properties', () => {
    const context = createMockContext({
      api: [{
        kind: 'class',
        name: 'MyClass',
        signature: 'class MyClass',
        properties: [
          { name: 'id', signature: 'id: number', description: 'Unique identifier' },
          { name: 'name', signature: 'name: string' },
        ],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Properties:**');
    expect(result).toContain('| Name | Type | Description |');
    expect(result).toContain('`id`');
    expect(result).toContain('Unique identifier');
    expect(result).toContain('`name`');
  });

  it('should format interface with extends', () => {
    const context = createMockContext({
      api: [{
        kind: 'interface',
        name: 'IExtended',
        signature: 'interface IExtended extends IBase, IOther',
        extends: ['IBase', 'IOther'],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Extends:** `IBase`, `IOther`');
  });

  it('should format interface with properties and methods', () => {
    const context = createMockContext({
      api: [{
        kind: 'interface',
        name: 'IConfig',
        signature: 'interface IConfig',
        properties: [
          { name: 'host', signature: 'host: string', description: 'Server host' },
          { name: 'port', signature: 'port: number' },
        ],
        methods: [
          { name: 'validate', signature: 'validate(): boolean' },
        ],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('| Property | Type | Description |');
    expect(result).toContain('`host`');
    expect(result).toContain('Server host');
    expect(result).toContain('<details>');
    expect(result).toContain('Full Definition');
    expect(result).toContain('validate(): boolean');
  });

  it('should format enums with members', () => {
    const context = createMockContext({
      api: [{
        kind: 'enum',
        name: 'Status',
        signature: 'enum Status',
        description: 'Status codes',
        members: [
          { name: 'Active', value: 1 },
          { name: 'Inactive', value: 0 },
          { name: 'Unknown' },
        ],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('### Enums');
    expect(result).toContain('Status');
    expect(result).toContain('| Member | Value |');
    expect(result).toContain('`Active`');
    expect(result).toContain('`1`');
    expect(result).toContain('`Inactive`');
    expect(result).toContain('`0`');
    expect(result).toContain('`Unknown`');
  });

  it('should format constants', () => {
    const context = createMockContext({
      api: [
        {
          kind: 'constant',
          name: 'VERSION',
          signature: 'const VERSION: string',
          description: 'Current version',
        },
        {
          kind: 'constant',
          name: 'MAX_SIZE',
          signature: 'const MAX_SIZE: number',
        },
      ],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('### Constants');
    expect(result).toContain('**`VERSION`**');
    expect(result).toContain('Current version');
    expect(result).toContain('**`MAX_SIZE`**');
  });

  it('should include yarn installation instructions', () => {
    const context = createMockContext();
    const result = generateMarkdown(context);

    expect(result).toContain('Or with yarn:');
    expect(result).toContain('yarn add test-package');
  });

  it('should handle deprecated class', () => {
    const context = createMockContext({
      api: [{
        kind: 'class',
        name: 'OldClass',
        signature: 'class OldClass',
        deprecated: true,
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('⚠️');
    expect(result).toContain('Deprecated');
  });

  it('should handle deprecated function with message', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'oldFunc',
        signature: 'function oldFunc(): void',
        deprecated: 'Use newFunc instead',
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('Use newFunc instead');
  });

  it('should handle deprecated function with boolean', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'oldFunc',
        signature: 'function oldFunc(): void',
        deprecated: true,
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('This function is deprecated');
  });

  it('should include TOC links for all entry types', () => {
    const context = createMockContext({
      api: [
        { kind: 'function', name: 'fn', signature: 'fn()' },
        { kind: 'class', name: 'Class', signature: 'class Class' },
        { kind: 'interface', name: 'IFace', signature: 'interface IFace' },
        { kind: 'type', name: 'Type', signature: 'type Type' },
      ],
      readme: {
        title: 'Test',
        description: 'Desc',
        quickStart: 'Example',
        sections: [],
      },
    });
    const result = generateMarkdown(context);

    expect(result).toContain('[Installation](#installation)');
    expect(result).toContain('[Quick Start](#quick-start)');
    expect(result).toContain('[API Reference](#api-reference)');
    expect(result).toContain('[Functions](#functions)');
    expect(result).toContain('[Classes](#classes)');
    expect(result).toContain('[Interfaces](#interfaces)');
    expect(result).toContain('[Types](#types)');
  });

  it('should handle methods with params in class method table', () => {
    const context = createMockContext({
      api: [{
        kind: 'class',
        name: 'Service',
        signature: 'class Service',
        methods: [
          {
            name: 'fetch',
            signature: 'fetch(url: string): Promise<string>',
            params: [{ name: 'url', type: 'string' }],
            returns: { type: 'Promise<string>' },
            description: 'Fetches data from URL',
          },
        ],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('| Method | Returns | Description |');
    expect(result).toContain('`fetch(url)`');
    expect(result).toContain('`Promise<string>`');
    expect(result).toContain('Fetches data from URL');
  });

  it('should handle source link without line number', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'test',
        signature: 'function test(): void',
        sourceFile: 'src/utils.ts',
      }],
    });
    const result = generateMarkdown(context, {
      repositoryUrl: 'https://github.com/user/repo',
    });

    expect(result).toContain('[View source]');
    expect(result).toContain('https://github.com/user/repo/blob/main/src/utils.ts');
    expect(result).not.toContain('#L');
  });

  it('should handle param without description', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'test',
        signature: 'function test(x: number): void',
        params: [{ name: 'x', type: 'number' }],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('`x`');
    expect(result).toContain('`number`');
    expect(result).toContain('| - |'); // Default description
  });

  it('should handle returns without description', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'test',
        signature: 'function test(): string',
        returns: { type: 'string' },
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('**Returns:**');
    expect(result).toContain('`string`');
  });

  it('should handle class method without params', () => {
    const context = createMockContext({
      api: [{
        kind: 'class',
        name: 'MyClass',
        signature: 'class MyClass',
        methods: [
          { name: 'run', signature: 'run(): void' },
        ],
      }],
    });
    const result = generateMarkdown(context);

    expect(result).toContain('`run()`');
  });

  it('should handle package without license', () => {
    const context = createMockContext({
      package: {
        name: 'no-license-pkg',
        version: '1.0.0',
        description: 'No license',
        tarball: 'https://example.com/test.tgz',
        files: new Map(),
      },
    });
    const result = generateMarkdown(context);

    // Should only have npm version badge, not license badge
    const badgeMatches = result.match(/img\.shields\.io/g) || [];
    expect(badgeMatches.length).toBe(1);
  });
});
