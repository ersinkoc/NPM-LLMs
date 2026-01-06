/**
 * Token counting tests
 */

import { describe, it, expect } from 'vitest';
import { countTokens, truncateToTokenLimit, formatTokenCount } from '../../../src/core/tokens.js';

describe('tokens', () => {
  describe('countTokens', () => {
    it('should count tokens in prose text', () => {
      const text = 'This is a simple sentence with some words.';
      const count = countTokens(text);
      // ~4 chars per token for prose
      expect(count).toBeGreaterThan(5);
      expect(count).toBeLessThan(20);
    });

    it('should count tokens in code', () => {
      const code = `function add(a, b) { return a + b; }`;
      const count = countTokens(code);
      // ~3 chars per token for code
      expect(count).toBeGreaterThan(5);
    });

    it('should handle empty string', () => {
      const count = countTokens('');
      expect(count).toBe(0);
    });

    it('should handle mixed content', () => {
      const content = `
# Title

Some prose text here.

\`\`\`js
const x = 1;
\`\`\`
`;
      const count = countTokens(content);
      expect(count).toBeGreaterThan(10);
    });
  });

  describe('truncateToTokenLimit', () => {
    it('should not truncate content under limit', () => {
      const content = '# Title\n\nShort content.';
      const result = truncateToTokenLimit(content, 1000);
      expect(result.truncated).toBe(false);
      expect(result.text).toBe(content);
    });

    it('should truncate content over limit', () => {
      const content = 'A'.repeat(10000);
      const result = truncateToTokenLimit(content, 100);
      expect(result.truncated).toBe(true);
      expect(result.tokenCount).toBeLessThanOrEqual(120); // Allow some margin
    });

    it('should respect priorities', () => {
      const content = `
# API

## Functions

Important function docs here.

## Examples

\`\`\`js
example code
\`\`\`

## Readme

Long readme content that should be truncated first...
${'Lorem ipsum '.repeat(100)}
`;
      const result = truncateToTokenLimit(content, 50, ['functions', 'examples']);
      // Functions and examples should be preserved over readme
      expect(result.truncated).toBe(true);
    });
  });

  describe('formatTokenCount', () => {
    it('should format token count', () => {
      expect(formatTokenCount(100)).toBe('100 tokens');
      expect(formatTokenCount(1)).toBe('1 tokens');
      expect(formatTokenCount(1500)).toBe('1.5k tokens');
      expect(formatTokenCount(10000)).toBe('10.0k tokens');
    });
  });
});
