/**
 * TypeScript source parser tests
 */

import { describe, it, expect } from 'vitest';
import { parseTypeScript, findTypeScriptFiles } from '../../../src/parsers/typescript.js';

describe('parseTypeScript', () => {
  describe('functions', () => {
    it('should parse exported function', () => {
      const content = `
export function greet(name: string): string {
  return "Hello " + name;
}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('function');
      expect(result.exports[0]!.name).toBe('greet');
      expect(result.exports[0]!.signature).toContain('function greet(name: string)');
      expect(result.exports[0]!.signature).toContain(': string');
    });

    it('should parse async function', () => {
      const content = `
export async function fetchData(url: string): Promise<string> {
  return await fetch(url).then(r => r.text());
}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.name).toBe('fetchData');
      expect(result.exports[0]!.signature).toContain('Promise<string>');
    });

    it('should parse function with generics', () => {
      const content = `
export function identity<T>(value: T): T {
  return value;
}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.signature).toContain('<T>');
    });

    it('should parse function parameters', () => {
      const content = `
export function test(a: string, b?: number, c: boolean = true): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params).toHaveLength(3);
      expect(result.exports[0]!.params![0]).toEqual(expect.objectContaining({
        name: 'a',
        type: 'string',
      }));
      expect(result.exports[0]!.params![1]).toEqual(expect.objectContaining({
        name: 'b',
        type: 'number',
        optional: true,
      }));
      expect(result.exports[0]!.params![2]).toEqual(expect.objectContaining({
        name: 'c',
        type: 'boolean',
        optional: true,
        defaultValue: 'true',
      }));
    });

    it('should parse function with JSDoc', () => {
      const content = `
/**
 * Greet a person
 * @param name - The name to greet
 * @returns A greeting message
 * @example greet("World")
 */
export function greet(name: string): string {
  return "Hello " + name;
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.description).toBe('Greet a person');
      expect(result.exports[0]!.params![0]!.description).toContain('The name to greet');
      expect(result.exports[0]!.examples).toContain('greet("World")');
    });

    it('should parse deprecated function', () => {
      const content = `
/**
 * @deprecated Use newFunction instead
 */
export function oldFunction(): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.deprecated).toContain('Use newFunction instead');
    });
  });

  describe('arrow functions', () => {
    it('should parse exported arrow function', () => {
      const content = `
export const add = (a: number, b: number): number => a + b;
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('function');
      expect(result.exports[0]!.name).toBe('add');
    });

    it('should parse async arrow function', () => {
      const content = `
export const fetchData = async (url: string): Promise<string> => {
  return await fetch(url).then(r => r.text());
};
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.name).toBe('fetchData');
    });

    it('should parse arrow function with return type', () => {
      const content = `
export const greet = (name: string): string => "Hello " + name;
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.name).toBe('greet');
    });
  });

  describe('classes', () => {
    it('should parse exported class', () => {
      const content = `
export class MyClass {
  constructor() {}
}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('class');
      expect(result.exports[0]!.name).toBe('MyClass');
      expect(result.exports[0]!.signature).toBe('class MyClass');
    });

    it('should parse class with generics', () => {
      const content = `
export class Container<T> {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.signature).toBe('class Container<T>');
    });

    it('should parse class extends', () => {
      const content = `
export class Child extends Parent {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.extends).toEqual(['Parent']);
    });

    it('should parse class implements', () => {
      const content = `
export class MyClass implements Interface1, Interface2 {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.implements).toEqual(['Interface1', 'Interface2']);
    });

    it('should parse abstract class', () => {
      const content = `
export abstract class BaseClass {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.kind).toBe('class');
      expect(result.exports[0]!.name).toBe('BaseClass');
    });
  });

  describe('interfaces', () => {
    it('should parse exported interface', () => {
      const content = `
export interface MyInterface {
  prop: string;
}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('interface');
      expect(result.exports[0]!.name).toBe('MyInterface');
      expect(result.exports[0]!.signature).toBe('interface MyInterface');
    });

    it('should parse interface with generics', () => {
      const content = `
export interface Container<T> {
  value: T;
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.signature).toBe('interface Container<T>');
    });

    it('should parse interface extends', () => {
      const content = `
export interface Extended extends Base1, Base2 {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.extends).toEqual(['Base1', 'Base2']);
    });
  });

  describe('types', () => {
    it('should parse exported type alias', () => {
      const content = `
export type MyType = string | number;
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('type');
      expect(result.exports[0]!.name).toBe('MyType');
      expect(result.exports[0]!.signature).toContain('type MyType = string | number');
    });

    it('should parse type with generics', () => {
      const content = `
export type Nullable<T> = T | null;
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.signature).toContain('<T>');
    });
  });

  describe('constants', () => {
    it('should parse exported const', () => {
      const content = `
export const VERSION: string = "1.0.0";
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('constant');
      expect(result.exports[0]!.name).toBe('VERSION');
      expect(result.exports[0]!.signature).toContain('const VERSION: string');
    });

    it('should parse const without type annotation', () => {
      const content = `
export const MAX_SIZE = 100;
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.signature).toBe('const MAX_SIZE');
    });

    it('should skip arrow functions in const parsing', () => {
      const content = `
export const fn = () => 42;
`;
      const result = parseTypeScript(content);

      // Should only have one entry (from arrow function parsing, not const)
      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('function');
    });
  });

  describe('enums', () => {
    it('should parse exported enum', () => {
      const content = `
export enum Status {
  Active,
  Inactive
}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.kind).toBe('enum');
      expect(result.exports[0]!.name).toBe('Status');
      expect(result.exports[0]!.signature).toBe('enum Status');
    });

    it('should parse const enum', () => {
      const content = `
export const enum Direction {
  Up,
  Down
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.kind).toBe('enum');
      expect(result.exports[0]!.name).toBe('Direction');
    });
  });

  describe('hasTypes', () => {
    it('should detect type annotations', () => {
      const content = `
export function fn(): string {}
`;
      const result = parseTypeScript(content);

      expect(result.hasTypes).toBe(true);
    });

    it('should detect interface keyword', () => {
      const content = `
interface Foo {}
`;
      const result = parseTypeScript(content);

      expect(result.hasTypes).toBe(true);
    });

    it('should detect type keyword', () => {
      const content = `
type Foo = string;
`;
      const result = parseTypeScript(content);

      expect(result.hasTypes).toBe(true);
    });

    it('should return false for plain JavaScript', () => {
      const content = `
export function fn() {
  return 42;
}
`;
      const result = parseTypeScript(content);

      expect(result.hasTypes).toBe(false);
    });
  });

  describe('parameter parsing', () => {
    it('should parse destructured object parameter', () => {
      const content = `
export function test({ a, b }: Options): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params).toHaveLength(1);
      expect(result.exports[0]!.params![0]!.name).toBe('options');
      expect(result.exports[0]!.params![0]!.type).toBe('Options');
    });

    it('should parse destructured array parameter', () => {
      const content = `
export function test([a, b]: string[]): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params).toHaveLength(1);
      expect(result.exports[0]!.params![0]!.name).toBe('options');
    });

    it('should infer type from default value - boolean', () => {
      const content = `
export function test(flag = true): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params![0]!.type).toBe('boolean');
    });

    it('should infer type from default value - string', () => {
      const content = `
export function test(name = "default"): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params![0]!.type).toBe('string');
    });

    it('should infer type from default value - number', () => {
      const content = `
export function test(count = 42): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params![0]!.type).toBe('number');
    });

    it('should infer type from default value - null', () => {
      const content = `
export function test(value = null): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params![0]!.type).toBe('null');
    });

    it('should infer type from default value - undefined', () => {
      const content = `
export function test(value = undefined): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params![0]!.type).toBe('undefined');
    });

    it('should infer type from default value - array', () => {
      const content = `
export function test(items = []): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params![0]!.type).toBe('unknown[]');
    });

    it('should infer type from default value - object', () => {
      const content = `
export function test(options = {}): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params![0]!.type).toBe('object');
    });

    it('should handle parameter with simple default', () => {
      const content = `
export function test(enabled: boolean = false): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(1);
      expect(result.exports[0]!.name).toBe('test');
      expect(result.exports[0]!.params![0]!.name).toBe('enabled');
      expect(result.exports[0]!.params![0]!.optional).toBe(true);
    });

    it('should handle empty params', () => {
      const content = `
export function test(): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params).toEqual([]);
    });

    it('should handle destructured object without type annotation', () => {
      const content = `
export function test({ a, b }): void {
}
`;
      const result = parseTypeScript(content);

      expect(result.exports[0]!.params).toHaveLength(1);
      expect(result.exports[0]!.params![0]!.name).toBe('options');
      expect(result.exports[0]!.params![0]!.type).toBe('object');
    });
  });

  describe('sourceFile tracking', () => {
    it('should include source file path', () => {
      const content = `
export function test(): void {}
`;
      const result = parseTypeScript(content, 'src/index.ts');

      expect(result.exports[0]!.sourceFile).toBe('src/index.ts');
    });
  });

  describe('multiple exports', () => {
    it('should parse multiple exports', () => {
      const content = `
export function fn1(): void {}
export function fn2(): void {}
export class MyClass {}
export interface MyInterface {}
export type MyType = string;
export const CONST = 1;
export enum MyEnum {}
`;
      const result = parseTypeScript(content);

      expect(result.exports).toHaveLength(7);
    });
  });
});

describe('findTypeScriptFiles', () => {
  it('should find src/index.ts', () => {
    const files = new Map([
      ['src/index.ts', 'content'],
      ['package.json', '{}'],
    ]);

    const result = findTypeScriptFiles(files);

    expect(result).toContain('src/index.ts');
  });

  it('should find index.ts in root', () => {
    const files = new Map([
      ['index.ts', 'content'],
    ]);

    const result = findTypeScriptFiles(files);

    expect(result).toContain('index.ts');
  });

  it('should prioritize main field variants', () => {
    const files = new Map([
      ['src/index.ts', 'content'],
      ['src/main.ts', 'main content'],
      ['lib/index.ts', 'lib content'],
    ]);

    const result = findTypeScriptFiles(files, './lib/index.js');

    // lib/index.ts should be prioritized
    expect(result[0]).toBe('lib/index.ts');
  });

  it('should find tsx files', () => {
    const files = new Map([
      ['src/index.tsx', 'content'],
    ]);

    const result = findTypeScriptFiles(files);

    expect(result).toContain('src/index.tsx');
  });

  it('should exclude .d.ts files', () => {
    const files = new Map([
      ['src/index.ts', 'content'],
      ['src/index.d.ts', 'types'],
    ]);

    const result = findTypeScriptFiles(files);

    expect(result).toContain('src/index.ts');
    expect(result).not.toContain('src/index.d.ts');
  });

  it('should return empty array for non-ts files', () => {
    const files = new Map([
      ['src/index.js', 'content'],
    ]);

    const result = findTypeScriptFiles(files);

    expect(result).toHaveLength(0);
  });

  it('should not duplicate files', () => {
    const files = new Map([
      ['src/index.ts', 'content'],
    ]);

    const result = findTypeScriptFiles(files);

    // Should only appear once
    const count = result.filter(f => f === 'src/index.ts').length;
    expect(count).toBe(1);
  });

  it('should handle main field without extension', () => {
    const files = new Map([
      ['lib/main.ts', 'content'],
    ]);

    const result = findTypeScriptFiles(files, './lib/main');

    expect(result).toContain('lib/main.ts');
  });

  it('should include non-priority .ts files after priority files', () => {
    const files = new Map([
      ['src/index.ts', 'index content'],
      ['src/utils.ts', 'utils content'],
      ['custom/helper.tsx', 'helper content'],
    ]);

    const result = findTypeScriptFiles(files);

    // All .ts/.tsx files should be included
    expect(result).toContain('src/index.ts');
    expect(result).toContain('src/utils.ts');
    expect(result).toContain('custom/helper.tsx');
    expect(result.length).toBe(3);
  });

  it('should add remaining .tsx files not in priority list', () => {
    const files = new Map([
      ['components/Button.tsx', 'button'],
      ['components/Input.tsx', 'input'],
    ]);

    const result = findTypeScriptFiles(files);

    expect(result).toContain('components/Button.tsx');
    expect(result).toContain('components/Input.tsx');
    expect(result.length).toBe(2);
  });
});

describe('additional edge cases', () => {
  it('should infer unknown type for variable reference defaults', () => {
    const content = `
export function test(value = someVariable): void {
}
`;
    const result = parseTypeScript(content);

    // Variable reference doesn't match any known pattern, so it should be 'unknown'
    expect(result.exports[0]!.params![0]!.type).toBe('unknown');
  });

  it('should handle simple function with body', () => {
    const content = `
export function calculateSum(a: number, b: number): number {
  return a + b;
}
`;
    const result = parseTypeScript(content);

    expect(result.exports).toHaveLength(1);
    expect(result.exports[0]!.name).toBe('calculateSum');
    expect(result.exports[0]!.kind).toBe('function');
  });

  it('should parse class with method body', () => {
    const content = `
export class Calculator {
  add(a: number, b: number): number {
    const sum = a + b;
    if (sum > 100) {
      return 100;
    }
    return sum;
  }
}
`;
    const result = parseTypeScript(content);

    expect(result.exports).toHaveLength(1);
    expect(result.exports[0]!.kind).toBe('class');
    expect(result.exports[0]!.name).toBe('Calculator');
  });

  it('should handle nested function bodies', () => {
    const content = `
export function outer(x: number): number {
  function inner(y: number): number {
    return y * 2;
  }
  return inner(x) + 1;
}
`;
    const result = parseTypeScript(content);

    expect(result.exports).toHaveLength(1);
    expect(result.exports[0]!.name).toBe('outer');
  });

  it('should handle function with array return type', () => {
    const content = `
export function getItems(): string[] {
  return ['a', 'b', 'c'];
}
`;
    const result = parseTypeScript(content);

    expect(result.exports).toHaveLength(1);
    expect(result.exports[0]!.name).toBe('getItems');
    expect(result.exports[0]!.signature).toContain('string[]');
  });
});
