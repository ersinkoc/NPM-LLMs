/**
 * DTS parser tests
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDts, findMainDtsFile, sortExports } from '../../../src/parsers/dts.js';

const FIXTURES_PATH = join(__dirname, '../../fixtures/sample-package');

describe('dts parser', () => {
  describe('parseDts', () => {
    it('should parse functions from .d.ts file', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const addFn = result.exports.find((e) => e.name === 'add');
      expect(addFn).toBeDefined();
      expect(addFn?.kind).toBe('function');
      expect(addFn?.params).toHaveLength(2);
      expect(addFn?.returns?.type).toBe('number');
    });

    it('should parse interfaces', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const config = result.exports.find((e) => e.name === 'Config');
      expect(config).toBeDefined();
      expect(config?.kind).toBe('interface');
    });

    it('should parse classes with methods', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const calculator = result.exports.find((e) => e.name === 'Calculator');
      expect(calculator).toBeDefined();
      expect(calculator?.kind).toBe('class');
      expect(calculator?.methods).toBeDefined();
      expect(calculator?.methods?.length).toBeGreaterThan(0);
    });

    it('should parse type aliases', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const operation = result.exports.find((e) => e.name === 'Operation');
      expect(operation).toBeDefined();
      expect(operation?.kind).toBe('type');
    });

    it('should parse enums', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const logLevel = result.exports.find((e) => e.name === 'LogLevel');
      expect(logLevel).toBeDefined();
      expect(logLevel?.kind).toBe('enum');
    });

    it('should parse constants', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const version = result.exports.find((e) => e.name === 'VERSION');
      expect(version).toBeDefined();
      expect(version?.kind).toBe('constant');
    });

    it('should extract JSDoc descriptions', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const addFn = result.exports.find((e) => e.name === 'add');
      expect(addFn?.description).toBe('Add two numbers together');
    });

    it('should extract examples', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const addFn = result.exports.find((e) => e.name === 'add');
      expect(addFn?.examples?.length).toBeGreaterThan(0);
    });

    it('should mark deprecated items', () => {
      const content = readFileSync(join(FIXTURES_PATH, 'index.d.ts'), 'utf-8');
      const result = parseDts(content);

      const sumFn = result.exports.find((e) => e.name === 'sum');
      expect(sumFn?.deprecated).toBeDefined();
    });
  });

  describe('sortExports', () => {
    it('should sort exports by kind priority', () => {
      const exports = [
        { kind: 'constant', name: 'A', signature: '' },
        { kind: 'function', name: 'B', signature: '' },
        { kind: 'class', name: 'C', signature: '' },
        { kind: 'type', name: 'D', signature: '' },
      ] as const;

      const sorted = sortExports([...exports] as any);
      expect(sorted[0].kind).toBe('function');
      expect(sorted[1].kind).toBe('class');
    });
  });

  describe('findMainDtsFile', () => {
    it('should find .d.ts file by types field', () => {
      const files = new Map([
        ['dist/index.d.ts', ''],
        ['src/index.ts', ''],
      ]);
      const result = findMainDtsFile(files, 'dist/index.d.ts');
      expect(result).toBe('dist/index.d.ts');
    });

    it('should find index.d.ts as fallback', () => {
      const files = new Map([
        ['index.d.ts', ''],
        ['src/index.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('index.d.ts');
    });

    it('should normalize types field with ./ prefix', () => {
      const files = new Map([
        ['lib/index.d.ts', ''],
      ]);
      const result = findMainDtsFile(files, './lib/index.d.ts');
      expect(result).toBe('lib/index.d.ts');
    });

    it('should find priority paths when types field not found', () => {
      const files = new Map([
        ['dist/index.d.ts', ''],
        ['other.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('dist/index.d.ts');
    });

    it('should find lib/index.d.ts', () => {
      const files = new Map([
        ['lib/index.d.ts', ''],
        ['other.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('lib/index.d.ts');
    });

    it('should find types/index.d.ts', () => {
      const files = new Map([
        ['types/index.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('types/index.d.ts');
    });

    it('should find src/index.d.ts', () => {
      const files = new Map([
        ['src/index.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('src/index.d.ts');
    });

    it('should find __types__/index.d.ts for merged @types packages', () => {
      const files = new Map([
        ['__types__/index.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('__types__/index.d.ts');
    });

    it('should find __types__/dist/index.d.ts', () => {
      const files = new Map([
        ['__types__/dist/index.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('__types__/dist/index.d.ts');
    });

    it('should prefer priority paths including __types__/index.d.ts', () => {
      // __types__/index.d.ts is in the priority list, so it gets found first
      const files = new Map([
        ['__types__/index.d.ts', ''],
        ['custom.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('__types__/index.d.ts');
    });

    it('should prefer non-__types__ files when priority paths not matched', () => {
      // When no priority paths match, non-__types__ .d.ts files are preferred
      const files = new Map([
        ['__types__/something.d.ts', ''],
        ['custom.d.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('custom.d.ts');
    });

    it('should fallback to __types__ .d.ts files', () => {
      const files = new Map([
        ['__types__/custom.d.ts', ''],
        ['src/index.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBe('__types__/custom.d.ts');
    });

    it('should return undefined when no .d.ts files', () => {
      const files = new Map([
        ['src/index.ts', ''],
      ]);
      const result = findMainDtsFile(files);
      expect(result).toBeUndefined();
    });

    it('should return undefined when types field points to non-existent file', () => {
      const files = new Map([
        ['src/index.ts', ''],
      ]);
      const result = findMainDtsFile(files, 'missing.d.ts');
      expect(result).toBeUndefined();
    });
  });

  describe('module augmentation parsing', () => {
    it('should parse declare module blocks', () => {
      const content = `
declare module "lodash" {
  interface LoDashStatic {
    /**
     * Maps a collection
     * @param arr The array to map
     * @returns Mapped array
     */
    map<T>(arr: T[]): T[];
  }
}`;
      const result = parseDts(content);
      expect(result.moduleName).toBe('lodash');
      // Should extract map as a function
      const mapFn = result.exports.find(e => e.name === 'map');
      expect(mapFn).toBeDefined();
      expect(mapFn?.kind).toBe('function');
    });

    it('should extract methods from LoDashStatic interface', () => {
      const content = `
declare module "lodash" {
  interface LoDashStatic {
    /**
     * Creates a clone of value
     */
    clone<T>(value: T): T;

    /**
     * Checks if value is empty
     */
    isEmpty(value: any): boolean;
  }
}`;
      const result = parseDts(content);
      expect(result.exports.length).toBe(2);
      expect(result.exports.map(e => e.name)).toContain('clone');
      expect(result.exports.map(e => e.name)).toContain('isEmpty');
    });

    it('should extract methods from interfaces ending with Static', () => {
      const content = `
declare module "mylib" {
  interface MyLibStatic {
    doSomething(input: string): string;
    doOther(value: number): number;
  }
}`;
      const result = parseDts(content);
      expect(result.exports.length).toBe(2);
      expect(result.exports[0].name).toBe('doSomething');
      expect(result.exports[1].name).toBe('doOther');
    });

    it('should skip constructor, toString, valueOf, toJSON methods', () => {
      const content = `
declare module "mylib" {
  interface MyStatic {
    constructor(): void;
    toString(): string;
    valueOf(): number;
    toJSON(): object;
    realMethod(x: number): number;
  }
}`;
      const result = parseDts(content);
      expect(result.exports.length).toBe(1);
      expect(result.exports[0].name).toBe('realMethod');
    });

    it('should not extract methods from regular interfaces', () => {
      const content = `
declare module "mylib" {
  interface Options {
    timeout: number;
    method(x: string): string;
  }
}`;
      const result = parseDts(content);
      // Options interface methods should not be extracted
      expect(result.exports.length).toBe(0);
    });

    it('should preserve JSDoc for module augmentation methods', () => {
      const content = `
declare module "lodash" {
  interface LoDashStatic {
    /**
     * Gets the first element
     * @param arr The array
     * @returns First element
     * @example first([1,2,3]) // returns 1
     */
    first<T>(arr: T[]): T | undefined;
  }
}`;
      const result = parseDts(content);
      const firstFn = result.exports.find(e => e.name === 'first');
      expect(firstFn).toBeDefined();
      expect(firstFn?.description).toBe('Gets the first element');
      expect(firstFn?.examples).toBeDefined();
      expect(firstFn?.examples?.length).toBeGreaterThan(0);
    });
  });

  describe('parseParameters edge cases', () => {
    it('should handle destructured object parameters', () => {
      const content = `
export function test({ a, b }: { a: string; b: number }): void;
`;
      const result = parseDts(content);
      const fn = result.exports.find(e => e.name === 'test');
      expect(fn).toBeDefined();
      expect(fn?.params?.[0].name).toBe('options');
    });

    it('should handle destructured array parameters', () => {
      const content = `
export function test([first, second]: [string, number]): void;
`;
      const result = parseDts(content);
      const fn = result.exports.find(e => e.name === 'test');
      expect(fn).toBeDefined();
      expect(fn?.params?.[0].name).toBe('options');
    });

    it('should handle parameters with just name', () => {
      const content = `
export function test(callback): void;
`;
      const result = parseDts(content);
      const fn = result.exports.find(e => e.name === 'test');
      expect(fn).toBeDefined();
      expect(fn?.params?.[0].name).toBe('callback');
      expect(fn?.params?.[0].type).toBe('unknown');
    });

    it('should handle optional parameters with ?', () => {
      const content = `
export function test(name?): void;
`;
      const result = parseDts(content);
      const fn = result.exports.find(e => e.name === 'test');
      expect(fn).toBeDefined();
      expect(fn?.params?.[0].optional).toBe(true);
    });

    it('should handle parameters with default values', () => {
      const content = `
export function test(count: number = 10): void;
`;
      const result = parseDts(content);
      const fn = result.exports.find(e => e.name === 'test');
      expect(fn).toBeDefined();
      expect(fn?.params?.[0].defaultValue).toBe('10');
    });

    it('should handle complex nested generics in parameters', () => {
      const content = `
export function test(map: Map<string, Array<number>>): void;
`;
      const result = parseDts(content);
      const fn = result.exports.find(e => e.name === 'test');
      expect(fn).toBeDefined();
      expect(fn?.params?.[0].type).toContain('Map');
    });

    it('should handle empty parameter string', () => {
      const content = `
export function test(): void;
`;
      const result = parseDts(content);
      const fn = result.exports.find(e => e.name === 'test');
      expect(fn).toBeDefined();
      expect(fn?.params).toHaveLength(0);
    });
  });

  describe('class parsing edge cases', () => {
    it('should parse abstract classes', () => {
      const content = `
export abstract class BaseClass<T> {
  abstract method(): T;
}
`;
      const result = parseDts(content);
      const cls = result.exports.find(e => e.name === 'BaseClass');
      expect(cls).toBeDefined();
      expect(cls?.kind).toBe('class');
    });

    it('should parse class with extends and implements', () => {
      const content = `
export class MyClass extends BaseClass implements Interface1, Interface2 {
  doStuff(): void;
}
`;
      const result = parseDts(content);
      const cls = result.exports.find(e => e.name === 'MyClass');
      expect(cls).toBeDefined();
      expect(cls?.extends).toContain('BaseClass');
      expect(cls?.implements).toContain('Interface1');
      expect(cls?.implements).toContain('Interface2');
    });

    it('should parse class properties', () => {
      const content = `
export class MyClass {
  readonly name: string;
  private count: number;
}
`;
      const result = parseDts(content);
      const cls = result.exports.find(e => e.name === 'MyClass');
      expect(cls).toBeDefined();
      expect(cls?.properties?.length).toBeGreaterThan(0);
    });
  });

  describe('interface parsing edge cases', () => {
    it('should parse interface with extends', () => {
      const content = `
export interface Extended extends Base1, Base2 {
  extra: string;
}
`;
      const result = parseDts(content);
      const iface = result.exports.find(e => e.name === 'Extended');
      expect(iface).toBeDefined();
      expect(iface?.extends).toContain('Base1');
      expect(iface?.extends).toContain('Base2');
    });

    it('should parse interface with generics', () => {
      const content = `
export interface Container<T, K extends string> {
  value: T;
  key: K;
}
`;
      const result = parseDts(content);
      const iface = result.exports.find(e => e.name === 'Container');
      expect(iface).toBeDefined();
      expect(iface?.typeParams).toContain('T');
    });
  });

  describe('enum parsing', () => {
    it('should parse enum with string values', () => {
      const content = `
export enum Colors {
  Red = "red",
  Green = "green",
  Blue = "blue"
}
`;
      const result = parseDts(content);
      const enumEntry = result.exports.find(e => e.name === 'Colors');
      expect(enumEntry).toBeDefined();
      expect(enumEntry?.kind).toBe('enum');
      expect(enumEntry?.members).toHaveLength(3);
      expect(enumEntry?.members?.[0].value).toBe('red');
    });

    it('should parse enum with numeric values', () => {
      const content = `
export enum Priority {
  Low = 1,
  Medium = 2,
  High = 3
}
`;
      const result = parseDts(content);
      const enumEntry = result.exports.find(e => e.name === 'Priority');
      expect(enumEntry).toBeDefined();
      expect(enumEntry?.members?.[0].value).toBe(1);
    });

    it('should parse const enum', () => {
      const content = `
export const enum Direction {
  Up,
  Down,
  Left,
  Right
}
`;
      const result = parseDts(content);
      const enumEntry = result.exports.find(e => e.name === 'Direction');
      expect(enumEntry).toBeDefined();
      expect(enumEntry?.kind).toBe('enum');
    });
  });

  describe('import parsing', () => {
    it('should collect import statements', () => {
      const content = `
import { Something } from './other';
import * as Utils from './utils';
import Default from './default';

export function test(): void;
`;
      const result = parseDts(content);
      expect(result.imports).toContain('./other');
      expect(result.imports).toContain('./utils');
      expect(result.imports).toContain('./default');
    });
  });

  describe('sortExports', () => {
    it('should sort by name within same kind', () => {
      const exports = [
        { kind: 'function', name: 'zebra', signature: '' },
        { kind: 'function', name: 'alpha', signature: '' },
        { kind: 'function', name: 'middle', signature: '' },
      ] as const;

      const sorted = sortExports([...exports] as any);
      expect(sorted[0].name).toBe('alpha');
      expect(sorted[1].name).toBe('middle');
      expect(sorted[2].name).toBe('zebra');
    });

    it('should sort all kinds correctly', () => {
      const exports = [
        { kind: 'constant', name: 'A', signature: '' },
        { kind: 'enum', name: 'B', signature: '' },
        { kind: 'type', name: 'C', signature: '' },
        { kind: 'interface', name: 'D', signature: '' },
        { kind: 'class', name: 'E', signature: '' },
        { kind: 'function', name: 'F', signature: '' },
      ] as const;

      const sorted = sortExports([...exports] as any);
      expect(sorted.map(s => s.kind)).toEqual([
        'function',
        'class',
        'interface',
        'type',
        'enum',
        'constant',
      ]);
    });
  });
});
