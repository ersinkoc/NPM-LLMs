/**
 * llms-full.txt output generator tests
 */

import { describe, it, expect } from 'vitest';
import { generateLlmsFullTxt } from '../../../src/outputs/llms-full.js';
import type { ExtractorContext, APIEntry } from '../../../src/types.js';

// Helper to create a minimal context
function createMockContext(overrides: Partial<ExtractorContext> = {}): ExtractorContext {
  return {
    package: {
      name: 'test-package',
      version: '1.0.0',
      description: 'A test package',
      tarball: 'http://test.com/test.tgz',
      license: 'MIT',
      homepage: 'https://example.com',
      repository: { type: 'git', url: 'https://github.com/test/test' },
      files: new Map(),
      ...overrides.package,
    },
    api: overrides.api || [],
    readme: overrides.readme,
    changelog: overrides.changelog,
    options: overrides.options || { formats: ['llms-full'] },
    outputs: overrides.outputs || new Map(),
    tokenCount: 0,
    truncated: false,
    startTime: Date.now(),
    fromCache: false,
    errors: [],
    ...overrides,
  };
}

describe('generateLlmsFullTxt', () => {
  describe('header section', () => {
    it('should include package name and version', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('# test-package v1.0.0');
    });

    it('should include description', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('> A test package');
    });

    it('should handle missing description', () => {
      const ctx = createMockContext({
        package: {
          name: 'test',
          version: '1.0.0',
          tarball: 'http://test.com/test.tgz',
          files: new Map(),
        },
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('# test v1.0.0');
      expect(output).not.toContain('> ');
    });
  });

  describe('package info section', () => {
    it('should include version', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('## Package Info');
      expect(output).toContain('**Version:** 1.0.0');
    });

    it('should include license when present', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**License:** MIT');
    });

    it('should include homepage when present', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Homepage:** https://example.com');
    });

    it('should include repository when present', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Repository:** https://github.com/test/test');
    });

    it('should handle missing optional fields', () => {
      const ctx = createMockContext({
        package: {
          name: 'test',
          version: '1.0.0',
          tarball: 'http://test.com/test.tgz',
          files: new Map(),
        },
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).not.toContain('**License:**');
      expect(output).not.toContain('**Homepage:**');
      expect(output).not.toContain('**Repository:**');
    });
  });

  describe('installation section', () => {
    it('should include installation commands', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('## Installation');
      expect(output).toContain('npm install test-package');
      expect(output).toContain('yarn add test-package');
      expect(output).toContain('pnpm add test-package');
    });
  });

  describe('quick start section', () => {
    it('should include quick start from readme', () => {
      const ctx = createMockContext({
        readme: {
          quickStart: 'import pkg from "test-package";\npkg.init();',
          sections: [],
        },
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('## Quick Start');
      expect(output).toContain('import pkg from "test-package"');
    });

    it('should omit quick start when not available', () => {
      const ctx = createMockContext();
      const output = generateLlmsFullTxt(ctx);

      expect(output).not.toContain('## Quick Start');
    });
  });

  describe('functions', () => {
    it('should format function with signature', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(a: string): void',
            description: 'A test function',
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('### Functions');
      expect(output).toContain('#### `testFn`');
      expect(output).toContain('A test function');
      expect(output).toContain('**Signature:**');
      expect(output).toContain('function testFn(a: string): void');
    });

    it('should format function parameters', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(a: string, b?: number): void',
            params: [
              { name: 'a', type: 'string', description: 'First param' },
              { name: 'b', type: 'number', optional: true, defaultValue: '10', description: 'Second param' },
            ],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Parameters:**');
      expect(output).toContain('`a: string`');
      expect(output).toContain('- First param');
      expect(output).toContain('`b: number` (optional) = `10`');
      expect(output).toContain('- Second param');
    });

    it('should format return type', () => {
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
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Returns:**');
      expect(output).toContain('`string` - The result');
    });

    it('should format examples', () => {
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
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Examples:**');
      expect(output).toContain('testFn()');
    });

    it('should handle examples with code blocks', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(): void',
            examples: ['```typescript\ntestFn()\n```'],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('```typescript\ntestFn()\n```');
    });

    it('should include deprecation notice', () => {
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
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('⚠️ **Deprecated:**');
      expect(output).toContain('Use newFn instead');
    });

    it('should handle boolean deprecation', () => {
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
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('This function is deprecated.');
    });

    it('should include source location when enabled', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(): void',
            sourceFile: 'src/index.ts',
            line: 42,
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx, { includeSourceLocations: true });

      expect(output).toContain('*Source: src/index.ts:42*');
    });
  });

  describe('classes', () => {
    it('should format class with signature', () => {
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
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('### Classes');
      expect(output).toContain('#### `TestClass`');
      expect(output).toContain('A test class');
    });

    it('should format class with extends', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'TestClass',
            signature: 'class TestClass',
            extends: ['BaseClass'],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('extends BaseClass');
    });

    it('should format class with implements', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'TestClass',
            signature: 'class TestClass',
            implements: ['Interface1', 'Interface2'],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('implements Interface1, Interface2');
    });

    it('should format class properties', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'TestClass',
            signature: 'class TestClass',
            properties: [
              {
                kind: 'constant',
                name: 'prop1',
                signature: 'prop1: string',
                description: 'A property',
              },
            ],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Properties:**');
      expect(output).toContain('`prop1`: `string`');
      expect(output).toContain('- A property');
    });

    it('should format class methods', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'TestClass',
            signature: 'class TestClass',
            methods: [
              {
                kind: 'function',
                name: 'method1',
                signature: 'method1(a: string): void',
                description: 'A method',
                params: [{ name: 'a', type: 'string' }],
                returns: { type: 'void' },
              },
            ],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Methods:**');
      expect(output).toContain('`method1(a: string): void`');
      expect(output).toContain('- A method');
    });

    it('should include deprecation notice for class', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'OldClass',
            signature: 'class OldClass',
            deprecated: 'Use NewClass',
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('⚠️ **Deprecated:**');
      expect(output).toContain('Use NewClass');
    });

    it('should format class examples without code blocks', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'TestClass',
            signature: 'class TestClass',
            examples: ['const tc = new TestClass();'],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Examples:**');
      expect(output).toContain('```typescript');
      expect(output).toContain('const tc = new TestClass();');
    });

    it('should format class examples with code blocks', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'TestClass',
            signature: 'class TestClass',
            examples: ['```javascript\nconst tc = new TestClass();\n```'],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('**Examples:**');
      expect(output).toContain('```javascript\nconst tc = new TestClass();\n```');
    });

    it('should handle boolean deprecation for class', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'class',
            name: 'OldClass',
            signature: 'class OldClass',
            deprecated: true,
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('This class is deprecated.');
    });
  });

  describe('interfaces', () => {
    it('should format interface', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'interface',
            name: 'TestInterface',
            signature: 'interface TestInterface',
            description: 'A test interface',
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('### Interfaces');
      expect(output).toContain('#### `TestInterface`');
      expect(output).toContain('A test interface');
    });

    it('should format interface with extends', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'interface',
            name: 'TestInterface',
            signature: 'interface TestInterface',
            extends: ['BaseInterface'],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('extends BaseInterface');
    });

    it('should format interface properties', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'interface',
            name: 'TestInterface',
            signature: 'interface TestInterface',
            properties: [
              { kind: 'constant', name: 'prop', signature: 'prop: string' },
            ],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('interface TestInterface {');
      expect(output).toContain('prop: string;');
    });

    it('should format interface methods', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'interface',
            name: 'TestInterface',
            signature: 'interface TestInterface',
            methods: [
              { kind: 'function', name: 'method', signature: 'method(): void' },
            ],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('method(): void;');
    });

    it('should include deprecation notice', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'interface',
            name: 'OldInterface',
            signature: 'interface OldInterface',
            deprecated: true,
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('⚠️ **Deprecated**');
    });
  });

  describe('types', () => {
    it('should format type alias', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'type',
            name: 'TestType',
            signature: 'type TestType = string | number',
            description: 'A union type',
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('### Types');
      expect(output).toContain('#### `TestType`');
      expect(output).toContain('A union type');
      expect(output).toContain('type TestType = string | number');
    });

    it('should include deprecation notice', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'type',
            name: 'OldType',
            signature: 'type OldType = any',
            deprecated: true,
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('⚠️ **Deprecated**');
    });
  });

  describe('enums', () => {
    it('should format enum', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'enum',
            name: 'TestEnum',
            signature: 'enum TestEnum',
            description: 'A test enum',
            members: [
              { name: 'A', value: 'a' },
              { name: 'B', value: 'b' },
            ],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('### Enums');
      expect(output).toContain('#### `TestEnum`');
      expect(output).toContain('A test enum');
      expect(output).toContain('enum TestEnum {');
      expect(output).toContain('A = "a",');
      expect(output).toContain('B = "b",');
    });

    it('should format enum with numeric values', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'enum',
            name: 'NumericEnum',
            signature: 'enum NumericEnum',
            members: [
              { name: 'First', value: 1 },
              { name: 'Second', value: 2 },
            ],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('First = 1,');
      expect(output).toContain('Second = 2,');
    });

    it('should format enum without values', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'enum',
            name: 'AutoEnum',
            signature: 'enum AutoEnum',
            members: [{ name: 'A' }, { name: 'B' }],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('A,');
      expect(output).toContain('B,');
    });
  });

  describe('constants', () => {
    it('should format constant', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'constant',
            name: 'TEST_CONST',
            signature: 'const TEST_CONST = 42',
            description: 'A constant value',
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      expect(output).toContain('### Constants');
      expect(output).toContain('#### `TEST_CONST`');
      expect(output).toContain('A constant value');
      expect(output).toContain('const TEST_CONST = 42');
    });
  });

  describe('options', () => {
    it('should exclude examples when disabled', () => {
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
      const output = generateLlmsFullTxt(ctx, { includeExamples: false });

      expect(output).not.toContain('**Examples:**');
    });

    it('should exclude param descriptions when disabled', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'testFn',
            signature: 'function testFn(a: string): void',
            params: [{ name: 'a', type: 'string', description: 'Param desc' }],
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx, { includeParamDescriptions: false });

      expect(output).not.toContain('**Parameters:**');
    });

    it('should exclude deprecations when disabled', () => {
      const ctx = createMockContext({
        api: [
          {
            kind: 'function',
            name: 'oldFn',
            signature: 'function oldFn(): void',
            deprecated: 'Use newFn',
          },
        ],
      });
      const output = generateLlmsFullTxt(ctx, { includeDeprecations: false });

      expect(output).not.toContain('⚠️ **Deprecated:**');
    });
  });

  describe('token counting', () => {
    it('should update tokenCount on context', () => {
      const ctx = createMockContext();
      generateLlmsFullTxt(ctx);

      expect(ctx.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('ordering', () => {
    it('should order sections correctly', () => {
      const ctx = createMockContext({
        api: [
          { kind: 'constant', name: 'CONST', signature: 'const CONST = 1' },
          { kind: 'function', name: 'fn', signature: 'function fn(): void' },
          { kind: 'class', name: 'Class', signature: 'class Class' },
          { kind: 'interface', name: 'Iface', signature: 'interface Iface' },
          { kind: 'type', name: 'Type', signature: 'type Type = string' },
          { kind: 'enum', name: 'Enum', signature: 'enum Enum' },
        ],
      });
      const output = generateLlmsFullTxt(ctx);

      const functionsIndex = output.indexOf('### Functions');
      const classesIndex = output.indexOf('### Classes');
      const interfacesIndex = output.indexOf('### Interfaces');
      const typesIndex = output.indexOf('### Types');
      const enumsIndex = output.indexOf('### Enums');
      const constantsIndex = output.indexOf('### Constants');

      expect(functionsIndex).toBeLessThan(classesIndex);
      expect(classesIndex).toBeLessThan(interfacesIndex);
      expect(interfacesIndex).toBeLessThan(typesIndex);
      expect(typesIndex).toBeLessThan(enumsIndex);
      expect(enumsIndex).toBeLessThan(constantsIndex);
    });
  });
});
