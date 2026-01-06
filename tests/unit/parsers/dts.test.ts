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
  });
});
