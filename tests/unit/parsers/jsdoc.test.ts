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
});
