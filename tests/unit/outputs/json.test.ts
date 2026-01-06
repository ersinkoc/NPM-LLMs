/**
 * Tests for src/outputs/json.ts
 */

import { describe, it, expect } from 'vitest';
import { generateJson, generateJsonObject, validateJsonOutput } from '../../../src/outputs/json.js';
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
      keywords: ['test', 'package'],
      homepage: 'https://example.com',
      repository: { url: 'https://github.com/test/test-package' },
    },
    api: [],
    readme: undefined,
    changelog: undefined,
    options: {
      formats: ['json'],
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

function createMockFunction(name: string): APIEntry {
  return {
    kind: 'function',
    name,
    signature: `function ${name}(): void`,
    description: 'A test function',
    params: [{ name: 'arg', type: 'string' }],
    returns: { type: 'void' },
    examples: [`${name}()`],
  };
}

describe('generateJson', () => {
  it('should generate valid JSON', () => {
    const context = createMockContext();
    const result = generateJson(context);

    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should include package metadata', () => {
    const context = createMockContext();
    const result = JSON.parse(generateJson(context));

    expect(result.package).toBeDefined();
    expect(result.package.name).toBe('test-package');
    expect(result.package.version).toBe('1.0.0');
    expect(result.package.description).toBe('A test package');
    expect(result.package.license).toBe('MIT');
  });

  it('should include keywords', () => {
    const context = createMockContext();
    const result = JSON.parse(generateJson(context));

    expect(result.package.keywords).toEqual(['test', 'package']);
  });

  it('should include API entries grouped by kind', () => {
    const context = createMockContext({
      api: [createMockFunction('testFn')],
    });
    const result = JSON.parse(generateJson(context));

    // API is an object with grouped arrays, not a flat array
    expect(result.api).toBeDefined();
    expect(result.api.functions).toBeInstanceOf(Array);
    expect(result.api.functions.length).toBe(1);
    expect(result.api.functions[0].name).toBe('testFn');
  });

  it('should include function details', () => {
    const context = createMockContext({
      api: [createMockFunction('detailedFn')],
    });
    const result = JSON.parse(generateJson(context));
    const fn = result.api.functions[0];

    expect(fn.signature).toContain('function detailedFn');
    expect(fn.description).toBe('A test function');
    expect(fn.params).toBeInstanceOf(Array);
    expect(fn.returns).toBeDefined();
    expect(fn.examples).toBeInstanceOf(Array);
  });

  it('should include stats', () => {
    const context = createMockContext({
      api: [
        createMockFunction('fn1'),
        createMockFunction('fn2'),
        { kind: 'class', name: 'Class1', signature: 'class Class1' },
        { kind: 'interface', name: 'IFace1', signature: 'interface IFace1' },
        { kind: 'type', name: 'Type1', signature: 'type Type1' },
      ],
    });
    const result = JSON.parse(generateJson(context));

    expect(result.stats).toBeDefined();
    expect(result.stats.totalExports).toBe(5);
    expect(result.stats.functions).toBe(2);
    expect(result.stats.classes).toBe(1);
    expect(result.stats.interfaces).toBe(1);
    expect(result.stats.types).toBe(1);
  });

  it('should include schema and generation timestamp', () => {
    const context = createMockContext();
    const result = JSON.parse(generateJson(context));

    expect(result.$schema).toBe('https://npm-llms.oxog.dev/schema/v1.json');
    expect(result.generatedAt).toBeDefined();
    // Check that generatedAt is a valid ISO date
    expect(() => new Date(result.generatedAt)).not.toThrow();
  });

  it('should handle empty API', () => {
    const context = createMockContext({ api: [] });
    const result = JSON.parse(generateJson(context));

    // Empty arrays are removed by default
    expect(result.stats.totalExports).toBe(0);
  });

  it('should handle multiple entry types', () => {
    const context = createMockContext({
      api: [
        { kind: 'function', name: 'fn', signature: 'fn()' },
        { kind: 'class', name: 'Cls', signature: 'class Cls' },
        { kind: 'interface', name: 'IFace', signature: 'interface IFace' },
        { kind: 'type', name: 'Typ', signature: 'type Typ' },
        { kind: 'constant', name: 'CONST', signature: 'const CONST: string' },
        { kind: 'enum', name: 'Enum', signature: 'enum Enum' },
      ],
    });
    const result = JSON.parse(generateJson(context));

    expect(result.api.functions).toHaveLength(1);
    expect(result.api.classes).toHaveLength(1);
    expect(result.api.interfaces).toHaveLength(1);
    expect(result.api.types).toHaveLength(1);
    expect(result.api.constants).toHaveLength(1);
    expect(result.api.enums).toHaveLength(1);
  });

  it('should preserve function params with optional flag', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'complexFn',
        signature: 'function complexFn(a: string, b?: number): Promise<void>',
        description: 'A complex function',
        params: [
          { name: 'a', type: 'string', description: 'First param' },
          { name: 'b', type: 'number', optional: true, description: 'Optional param' },
        ],
        returns: { type: 'Promise<void>', description: 'A promise' },
        examples: ['await complexFn("test")'],
        deprecated: false,
        since: '1.0.0',
      }],
    });
    const result = JSON.parse(generateJson(context));
    const fn = result.api.functions[0];

    expect(fn.params).toHaveLength(2);
    expect(fn.params[1].optional).toBe(true);
    expect(fn.since).toBe('1.0.0');
  });

  it('should format JSON with proper indentation by default', () => {
    const context = createMockContext();
    const result = generateJson(context);

    // Check that JSON is formatted (contains newlines and indentation)
    expect(result).toContain('\n');
    expect(result).toMatch(/^\{/); // Starts with {
    expect(result).toMatch(/\}$/); // Ends with }
  });

  it('should support compact mode with pretty=false', () => {
    const context = createMockContext();
    const result = generateJson(context, { pretty: false });

    // Compact JSON should not have newlines
    expect(result).not.toContain('\n');
  });
});

describe('generateJsonObject', () => {
  it('should return a JsonOutput object', () => {
    const context = createMockContext();
    const result = generateJsonObject(context);

    expect(result.$schema).toBeDefined();
    expect(result.generatedAt).toBeDefined();
    expect(result.package).toBeDefined();
    expect(result.api).toBeDefined();
    expect(result.stats).toBeDefined();
  });

  it('should include empty arrays when includeEmpty is true', () => {
    const context = createMockContext({ api: [] });
    const result = generateJsonObject(context, { includeEmpty: true });

    expect(result.api.functions).toEqual([]);
    expect(result.api.classes).toEqual([]);
    expect(result.api.interfaces).toEqual([]);
    expect(result.api.types).toEqual([]);
    expect(result.api.enums).toEqual([]);
    expect(result.api.constants).toEqual([]);
  });

  it('should exclude source locations when includeSourceLocations is false', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'fn',
        signature: 'fn()',
        sourceFile: 'index.ts',
        line: 10,
      }],
    });
    const result = generateJsonObject(context, { includeSourceLocations: false });

    expect(result.api.functions[0].sourceFile).toBeUndefined();
    expect(result.api.functions[0].line).toBeUndefined();
  });

  it('should include source locations by default', () => {
    const context = createMockContext({
      api: [{
        kind: 'function',
        name: 'fn',
        signature: 'fn()',
        sourceFile: 'index.ts',
        line: 10,
      }],
    });
    const result = generateJsonObject(context);

    expect(result.api.functions[0].sourceFile).toBe('index.ts');
    expect(result.api.functions[0].line).toBe(10);
  });
});

describe('validateJsonOutput', () => {
  it('should validate correct output', () => {
    const context = createMockContext();
    const output = generateJsonObject(context, { includeEmpty: true });
    const validation = validateJsonOutput(output);

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
  });

  it('should reject non-object input', () => {
    const validation = validateJsonOutput(null);

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Output must be an object');
  });

  it('should detect missing required fields', () => {
    const validation = validateJsonOutput({});

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Missing $schema field');
    expect(validation.errors).toContain('Missing generatedAt field');
    expect(validation.errors).toContain('Missing package field');
    expect(validation.errors).toContain('Missing api field');
    expect(validation.errors).toContain('Missing stats field');
  });

  it('should detect missing package.name and package.version', () => {
    const validation = validateJsonOutput({
      $schema: 'test',
      generatedAt: 'test',
      package: {},
      api: {},
      stats: {},
    });

    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Missing package.name');
    expect(validation.errors).toContain('Missing package.version');
  });
});

describe('class transformation', () => {
  it('should transform class entries correctly', () => {
    const context = createMockContext({
      api: [{
        kind: 'class',
        name: 'TestClass',
        signature: 'class TestClass',
        description: 'A test class',
        extends: ['BaseClass'],
        implements: ['ISerializable'],
        typeParams: ['T'],
        properties: [
          { kind: 'property', name: 'value', signature: 'value: string', description: 'A value' },
        ],
        methods: [
          { kind: 'function', name: 'getValue', signature: 'getValue(): string', description: 'Gets the value' },
        ],
      }],
    });
    const result = generateJsonObject(context);
    const cls = result.api.classes[0];

    expect(cls.name).toBe('TestClass');
    expect(cls.description).toBe('A test class');
    expect(cls.extends).toEqual(['BaseClass']);
    expect(cls.implements).toEqual(['ISerializable']);
    expect(cls.typeParams).toEqual(['T']);
    expect(cls.properties).toHaveLength(1);
    expect(cls.properties[0].name).toBe('value');
    expect(cls.methods).toHaveLength(1);
    expect(cls.methods[0].name).toBe('getValue');
  });
});

describe('interface transformation', () => {
  it('should transform interface entries correctly', () => {
    const context = createMockContext({
      api: [{
        kind: 'interface',
        name: 'ITestInterface',
        signature: 'interface ITestInterface',
        description: 'A test interface',
        extends: ['IBase'],
        typeParams: ['T'],
        properties: [
          { kind: 'property', name: 'id', signature: 'id: number', description: 'The ID' },
          { kind: 'property', name: 'name', signature: 'name?: string', description: 'Optional name' },
        ],
        methods: [
          { kind: 'function', name: 'process', signature: 'process(): void', description: 'Process the data' },
        ],
      }],
    });
    const result = generateJsonObject(context);
    const iface = result.api.interfaces[0];

    expect(iface.name).toBe('ITestInterface');
    expect(iface.extends).toEqual(['IBase']);
    expect(iface.typeParams).toEqual(['T']);
    expect(iface.properties).toHaveLength(2);
    expect(iface.properties[1].optional).toBe(true); // name?: string
    expect(iface.methods).toHaveLength(1);
  });
});

describe('enum transformation', () => {
  it('should transform enum entries correctly', () => {
    const context = createMockContext({
      api: [{
        kind: 'enum',
        name: 'Status',
        signature: 'enum Status',
        description: 'Status enum',
        members: [
          { name: 'Pending', value: 0 },
          { name: 'Active', value: 1 },
          { name: 'Completed', value: 2 },
        ],
      }],
    });
    const result = generateJsonObject(context);
    const enumEntry = result.api.enums[0];

    expect(enumEntry.name).toBe('Status');
    expect(enumEntry.description).toBe('Status enum');
    expect(enumEntry.members).toHaveLength(3);
    expect(enumEntry.members[0]).toEqual({ name: 'Pending', value: 0 });
  });
});

describe('constant transformation', () => {
  it('should transform constant entries correctly', () => {
    const context = createMockContext({
      api: [{
        kind: 'constant',
        name: 'MAX_SIZE',
        signature: 'const MAX_SIZE: number',
        description: 'Maximum size limit',
      }],
    });
    const result = generateJsonObject(context);
    const constant = result.api.constants[0];

    expect(constant.name).toBe('MAX_SIZE');
    expect(constant.type).toBe('number');
    expect(constant.description).toBe('Maximum size limit');
  });
});

describe('type transformation', () => {
  it('should transform type entries correctly', () => {
    const context = createMockContext({
      api: [{
        kind: 'type',
        name: 'Callback',
        signature: 'type Callback<T> = (value: T) => void',
        description: 'A callback type',
        typeParams: ['T'],
        deprecated: 'Use Handler instead',
      }],
    });
    const result = generateJsonObject(context);
    const type = result.api.types[0];

    expect(type.name).toBe('Callback');
    expect(type.signature).toBe('type Callback<T> = (value: T) => void');
    expect(type.description).toBe('A callback type');
    expect(type.typeParams).toEqual(['T']);
    expect(type.deprecated).toBe('Use Handler instead');
  });
});

describe('stats calculation', () => {
  it('should count documented entries', () => {
    const context = createMockContext({
      api: [
        { kind: 'function', name: 'fn1', signature: 'fn1()', description: 'Documented' },
        { kind: 'function', name: 'fn2', signature: 'fn2()' }, // No description
        { kind: 'function', name: 'fn3', signature: 'fn3()', description: 'Also documented' },
      ],
    });
    const result = generateJsonObject(context);

    expect(result.stats.documented).toBe(2);
  });

  it('should count entries with examples', () => {
    const context = createMockContext({
      api: [
        { kind: 'function', name: 'fn1', signature: 'fn1()', examples: ['fn1()'] },
        { kind: 'function', name: 'fn2', signature: 'fn2()' }, // No examples
        { kind: 'function', name: 'fn3', signature: 'fn3()', examples: ['fn3()', 'fn3(true)'] },
      ],
    });
    const result = generateJsonObject(context);

    expect(result.stats.withExamples).toBe(2);
  });
});
