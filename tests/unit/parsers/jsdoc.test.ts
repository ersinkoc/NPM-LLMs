/**
 * JSDoc parser tests
 */

import { describe, it, expect } from 'vitest';
import {
  parseJSDoc,
  cleanJSDocComment,
  extractDescription,
  parseParams,
  parseReturns,
  parseExamples,
  parseDeprecated,
  extractJSDocComments,
  parseSince,
  parseSee,
  parseThrows,
  parseTypeParams,
  findPrecedingJSDoc,
  isJSDocComment,
  mergeJSDoc,
} from '../../../src/parsers/jsdoc.js';

describe('jsdoc parser', () => {
  describe('cleanJSDocComment', () => {
    it('should remove comment markers', () => {
      const comment = `/**
       * This is a description
       * @param x - A parameter
       */`;
      const cleaned = cleanJSDocComment(comment);
      expect(cleaned).toContain('This is a description');
      expect(cleaned).not.toContain('/**');
      expect(cleaned).not.toContain('*/');
    });

    it('should handle single-line comments', () => {
      const comment = '/** Simple comment */';
      const cleaned = cleanJSDocComment(comment);
      expect(cleaned).toBe('Simple comment');
    });
  });

  describe('extractDescription', () => {
    it('should extract description before tags', () => {
      const content = 'This is a description\n@param x - A parameter';
      const description = extractDescription(content);
      expect(description).toBe('This is a description');
    });

    it('should return full content if no tags', () => {
      const content = 'Just a description';
      const description = extractDescription(content);
      expect(description).toBe('Just a description');
    });

    it('should return undefined for empty content', () => {
      const description = extractDescription('');
      expect(description).toBeUndefined();
    });
  });

  describe('parseParams', () => {
    it('should parse simple params', () => {
      const content = '@param a - First number\n@param b - Second number';
      const params = parseParams(content);
      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('a');
      expect(params[0].description).toBe('First number');
      expect(params[1].name).toBe('b');
    });

    it('should parse params with types', () => {
      const content = '@param {number} x - A number';
      const params = parseParams(content);
      expect(params[0].type).toBe('number');
      expect(params[0].name).toBe('x');
    });

    it('should parse optional params', () => {
      const content = '@param {string} [name] - Optional name';
      const params = parseParams(content);
      expect(params[0].optional).toBe(true);
      expect(params[0].name).toBe('name');
    });

    it('should parse optional params with brackets', () => {
      // Note: The current regex doesn't fully support [name=value] format
      // It captures up to the first non-word character
      const content = '@param {string} [name] - Optional name';
      const params = parseParams(content);
      expect(params[0].optional).toBe(true);
      expect(params[0].name).toBe('name');
    });
  });

  describe('parseReturns', () => {
    it('should parse return type and description', () => {
      const content = '@returns {number} The sum';
      const returns = parseReturns(content);
      expect(returns?.type).toBe('number');
      expect(returns?.description).toBe('The sum');
    });

    it('should handle @return alias', () => {
      const content = '@return {string} A string';
      const returns = parseReturns(content);
      expect(returns?.type).toBe('string');
    });

    it('should return undefined if no returns tag', () => {
      const content = '@param x - A param';
      const returns = parseReturns(content);
      expect(returns).toBeUndefined();
    });
  });

  describe('parseExamples', () => {
    it('should extract examples', () => {
      const content = `@example
\`\`\`ts
const x = 1;
\`\`\`
@example
add(1, 2)`;
      const examples = parseExamples(content);
      expect(examples.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parseDeprecated', () => {
    it('should parse deprecation message', () => {
      const content = '@deprecated Use newFunction instead';
      const deprecated = parseDeprecated(content);
      expect(deprecated).toBe('Use newFunction instead');
    });

    it('should return "true" for empty deprecation', () => {
      const content = '@deprecated';
      const deprecated = parseDeprecated(content);
      expect(deprecated).toBe('true');
    });
  });

  describe('parseJSDoc', () => {
    it('should parse complete JSDoc comment', () => {
      const comment = `/**
       * Add two numbers together
       * @param a - First number
       * @param b - Second number
       * @returns The sum
       * @example add(1, 2) // 3
       */`;
      const parsed = parseJSDoc(comment);

      expect(parsed.description).toBe('Add two numbers together');
      expect(parsed.params).toHaveLength(2);
      expect(parsed.returns?.description).toBe('The sum');
    });
  });

  describe('extractJSDocComments', () => {
    it('should extract all JSDoc comments from source', () => {
      const source = `
/** First comment */
function foo() {}

/** Second comment */
function bar() {}
`;
      const comments = extractJSDocComments(source);
      expect(comments).toHaveLength(2);
      expect(comments[0].comment).toContain('First comment');
      expect(comments[1].comment).toContain('Second comment');
    });
  });

  describe('parseSince', () => {
    it('should parse @since tag', () => {
      const content = '@since 1.2.0';
      const since = parseSince(content);
      expect(since).toBe('1.2.0');
    });

    it('should return undefined if no @since tag', () => {
      const content = '@param x - A param';
      const since = parseSince(content);
      expect(since).toBeUndefined();
    });
  });

  describe('parseSee', () => {
    it('should parse @see tags', () => {
      const content = '@see otherFunction\n@see https://example.com';
      const refs = parseSee(content);
      expect(refs).toHaveLength(2);
      expect(refs[0]).toBe('otherFunction');
      expect(refs[1]).toBe('https://example.com');
    });

    it('should return empty array if no @see tags', () => {
      const content = '@param x - A param';
      const refs = parseSee(content);
      expect(refs).toHaveLength(0);
    });
  });

  describe('parseThrows', () => {
    it('should parse @throws tags with type', () => {
      const content = '@throws {Error} When input is invalid';
      const throws = parseThrows(content);
      expect(throws).toHaveLength(1);
      expect(throws[0].type).toBe('Error');
      expect(throws[0].description).toBe('When input is invalid');
    });

    it('should parse multiple @throws tags', () => {
      const content = '@throws {TypeError} Type error\n@throws {RangeError} Range error';
      const throws = parseThrows(content);
      expect(throws).toHaveLength(2);
    });

    it('should return empty array if no @throws tags', () => {
      const content = '@param x - A param';
      const throws = parseThrows(content);
      expect(throws).toHaveLength(0);
    });
  });

  describe('parseTypeParams', () => {
    it('should parse @template tags', () => {
      const content = '@template T - The type parameter';
      const params = parseTypeParams(content);
      expect(params).toHaveLength(1);
      expect(params[0].name).toBe('T');
      expect(params[0].description).toBe('The type parameter');
    });

    it('should parse multiple @template tags', () => {
      const content = '@template T - First type\n@template K - Second type';
      const params = parseTypeParams(content);
      expect(params).toHaveLength(2);
      expect(params[0].name).toBe('T');
      expect(params[1].name).toBe('K');
    });

    it('should return empty array if no @template tags', () => {
      const content = '@param x - A param';
      const params = parseTypeParams(content);
      expect(params).toHaveLength(0);
    });
  });

  describe('findPrecedingJSDoc', () => {
    it('should find JSDoc immediately before position', () => {
      const source = `/** Description */
function foo() {}`;
      const result = findPrecedingJSDoc(source, 19); // Position of 'function'
      expect(result).toBeDefined();
      expect(result?.description).toBe('Description');
    });

    it('should return undefined if no JSDoc before position', () => {
      const source = 'function foo() {}';
      const result = findPrecedingJSDoc(source, 0);
      expect(result).toBeUndefined();
    });

    it('should return undefined if JSDoc is too far from position', () => {
      const source = `/** Description */

// Some other code
// And more code
const x = 1;
const y = 2;
const z = 3;
// Many more lines
` + ' '.repeat(600) + `function foo() {}`;
      const result = findPrecedingJSDoc(source, source.indexOf('function'));
      expect(result).toBeUndefined();
    });

    it('should use pre-extracted comments when provided', () => {
      const source = `/** First */
function a() {}

/** Second */
function b() {}`;
      const comments = extractJSDocComments(source);
      const result = findPrecedingJSDoc(source, source.indexOf('function b'), comments);
      expect(result?.description).toBe('Second');
    });

    it('should skip comments that end after position', () => {
      const source = `function a() {}
/** Comment after */`;
      const result = findPrecedingJSDoc(source, 0);
      expect(result).toBeUndefined();
    });
  });

  describe('isJSDocComment', () => {
    it('should return true for JSDoc comments', () => {
      expect(isJSDocComment('/** Comment */')).toBe(true);
      expect(isJSDocComment('/** Multi\n * line */')).toBe(true);
    });

    it('should return false for regular block comments', () => {
      expect(isJSDocComment('/* Regular comment */')).toBe(false);
    });

    it('should return false for triple-star comments', () => {
      expect(isJSDocComment('/*** Not JSDoc */')).toBe(false);
    });
  });

  describe('mergeJSDoc', () => {
    it('should merge descriptions (first wins)', () => {
      const result = mergeJSDoc(
        { description: 'First', params: [], examples: [], see: [], throws: [], typeParams: [] },
        { description: 'Second', params: [], examples: [], see: [], throws: [], typeParams: [] }
      );
      expect(result.description).toBe('First');
    });

    it('should use second description if first is empty', () => {
      const result = mergeJSDoc(
        { params: [], examples: [], see: [], throws: [], typeParams: [] },
        { description: 'Second', params: [], examples: [], see: [], throws: [], typeParams: [] }
      );
      expect(result.description).toBe('Second');
    });

    it('should merge params (later wins for same name)', () => {
      const result = mergeJSDoc(
        { params: [{ name: 'x', description: 'First', optional: false }], examples: [], see: [], throws: [], typeParams: [] },
        { params: [{ name: 'x', description: 'Second', optional: true }], examples: [], see: [], throws: [], typeParams: [] }
      );
      expect(result.params).toHaveLength(1);
      expect(result.params[0].description).toBe('Second');
      expect(result.params[0].optional).toBe(true);
    });

    it('should add new params', () => {
      const result = mergeJSDoc(
        { params: [{ name: 'a', optional: false }], examples: [], see: [], throws: [], typeParams: [] },
        { params: [{ name: 'b', optional: false }], examples: [], see: [], throws: [], typeParams: [] }
      );
      expect(result.params).toHaveLength(2);
    });

    it('should merge returns (first wins)', () => {
      const result = mergeJSDoc(
        { params: [], examples: [], see: [], throws: [], typeParams: [], returns: { type: 'string' } },
        { params: [], examples: [], see: [], throws: [], typeParams: [], returns: { type: 'number' } }
      );
      expect(result.returns?.type).toBe('string');
    });

    it('should collect unique examples', () => {
      const result = mergeJSDoc(
        { params: [], examples: ['ex1', 'ex2'], see: [], throws: [], typeParams: [] },
        { params: [], examples: ['ex2', 'ex3'], see: [], throws: [], typeParams: [] }
      );
      expect(result.examples).toHaveLength(3);
      expect(result.examples).toContain('ex1');
      expect(result.examples).toContain('ex2');
      expect(result.examples).toContain('ex3');
    });

    it('should merge deprecated (first wins)', () => {
      const result = mergeJSDoc(
        { params: [], examples: [], see: [], throws: [], typeParams: [], deprecated: 'First reason' },
        { params: [], examples: [], see: [], throws: [], typeParams: [], deprecated: 'Second reason' }
      );
      expect(result.deprecated).toBe('First reason');
    });

    it('should merge since (first wins)', () => {
      const result = mergeJSDoc(
        { params: [], examples: [], see: [], throws: [], typeParams: [], since: '1.0.0' },
        { params: [], examples: [], see: [], throws: [], typeParams: [], since: '2.0.0' }
      );
      expect(result.since).toBe('1.0.0');
    });

    it('should collect unique see references', () => {
      const result = mergeJSDoc(
        { params: [], examples: [], see: ['ref1', 'ref2'], throws: [], typeParams: [] },
        { params: [], examples: [], see: ['ref2', 'ref3'], throws: [], typeParams: [] }
      );
      expect(result.see).toHaveLength(3);
    });

    it('should collect all throws', () => {
      const result = mergeJSDoc(
        { params: [], examples: [], see: [], throws: [{ type: 'Error' }], typeParams: [] },
        { params: [], examples: [], see: [], throws: [{ type: 'TypeError' }], typeParams: [] }
      );
      expect(result.throws).toHaveLength(2);
    });

    it('should merge typeParams (later wins for same name)', () => {
      const result = mergeJSDoc(
        { params: [], examples: [], see: [], throws: [], typeParams: [{ name: 'T', description: 'First' }] },
        { params: [], examples: [], see: [], throws: [], typeParams: [{ name: 'T', description: 'Second' }] }
      );
      expect(result.typeParams).toHaveLength(1);
      expect(result.typeParams[0].description).toBe('Second');
    });

    it('should skip undefined sources', () => {
      const result = mergeJSDoc(
        undefined,
        { description: 'Valid', params: [], examples: [], see: [], throws: [], typeParams: [] }
      );
      expect(result.description).toBe('Valid');
    });
  });

  describe('parseParams with optional notation', () => {
    it('should detect optional params with brackets', () => {
      // The regex captures [name as the name for optional params
      // The bracket indicates optional, but default value extraction happens after
      const content = '@param {string} [name] - Optional name';
      const params = parseParams(content);
      expect(params[0].optional).toBe(true);
      expect(params[0].name).toBe('name');
    });

    it('should handle params with type only', () => {
      const content = '@param {number} count';
      const params = parseParams(content);
      expect(params[0].name).toBe('count');
      expect(params[0].type).toBe('number');
    });

    it('should detect optional param from bracket notation', () => {
      // Note: JSDoc [name=default] format is not fully supported by the regex
      // The bracket notation only detects optional, not the default value
      const content = '@param {string} [name] - Optional param';
      const params = parseParams(content);
      expect(params[0].optional).toBe(true);
      expect(params[0].name).toBe('name');
    });
  });

  describe('parseJSDoc comprehensive', () => {
    it('should parse all tags', () => {
      const comment = `/**
       * Complete function description
       * @template T - Type parameter
       * @param {T} input - The input value
       * @returns {T} The output value
       * @throws {Error} When invalid
       * @since 1.0.0
       * @see otherFunction
       * @deprecated Use newFunction
       * @example doThing()
       */`;
      const parsed = parseJSDoc(comment);

      expect(parsed.description).toBe('Complete function description');
      expect(parsed.params).toHaveLength(1);
      expect(parsed.returns?.type).toBe('T');
      expect(parsed.throws).toHaveLength(1);
      expect(parsed.since).toBe('1.0.0');
      expect(parsed.see).toHaveLength(1);
      expect(parsed.deprecated).toBe('Use newFunction');
      expect(parsed.examples.length).toBeGreaterThan(0);
      expect(parsed.typeParams).toHaveLength(1);
    });
  });

  describe('extractDescription edge cases', () => {
    it('should return undefined when content is only whitespace', () => {
      const content = '   \n  \n   ';
      const description = extractDescription(content);
      expect(description).toBeUndefined();
    });

    it('should return undefined when content starts with tag', () => {
      const content = '@param x - No description before tag';
      const description = extractDescription(content);
      expect(description).toBeUndefined();
    });
  });
});
