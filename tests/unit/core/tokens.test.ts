/**
 * Token counting tests
 */

import { describe, it, expect } from 'vitest';
import {
  countTokens,
  countCodeTokens,
  countMarkdownTokens,
  fitsTokenLimit,
  parseSections,
  prioritizeSections,
  truncateToTokenLimit,
  formatTokenCount,
  tokenUsagePercent,
} from '../../../src/core/tokens.js';

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

    it('should handle multiple code blocks', () => {
      const content = `
Some text
\`\`\`js
code1
\`\`\`
More text
\`\`\`ts
code2
\`\`\`
Final text
`;
      const count = countTokens(content);
      expect(count).toBeGreaterThan(10);
    });
  });

  describe('countCodeTokens', () => {
    it('should count tokens in code', () => {
      const code = 'function test() {}';
      const count = countCodeTokens(code);
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for empty string', () => {
      expect(countCodeTokens('')).toBe(0);
    });
  });

  describe('countMarkdownTokens', () => {
    it('should count tokens in markdown', () => {
      const md = '# Title\n\nSome text here';
      const count = countMarkdownTokens(md);
      expect(count).toBeGreaterThan(0);
    });

    it('should return 0 for empty string', () => {
      expect(countMarkdownTokens('')).toBe(0);
    });

    it('should handle markdown with code blocks', () => {
      const md = `
# Heading

Some text

\`\`\`js
const x = 1;
\`\`\`

More text
`;
      const count = countMarkdownTokens(md);
      expect(count).toBeGreaterThan(10);
    });
  });

  describe('fitsTokenLimit', () => {
    it('should return true for text under limit', () => {
      expect(fitsTokenLimit('short text', 100)).toBe(true);
    });

    it('should return false for text over limit', () => {
      const longText = 'A'.repeat(1000);
      expect(fitsTokenLimit(longText, 10)).toBe(false);
    });
  });

  describe('parseSections', () => {
    it('should parse headings into sections', () => {
      const text = `
# First Section

Content 1

## Second Section

Content 2
`;
      const sections = parseSections(text);
      expect(sections.length).toBeGreaterThan(0);
      expect(sections[0].title).toBe('First Section');
    });

    it('should handle content before first heading', () => {
      const text = `Some intro content

# First Section

Content`;
      const sections = parseSections(text);
      expect(sections.length).toBe(2);
      expect(sections[0].id).toBe('intro');
    });

    it('should infer priority from section titles', () => {
      const text = `
# Functions

function content

# Examples

example content

# Classes

class content
`;
      const sections = parseSections(text);
      expect(sections.find((s) => s.title === 'Functions')?.priority).toBe('functions');
      expect(sections.find((s) => s.title === 'Examples')?.priority).toBe('examples');
      expect(sections.find((s) => s.title === 'Classes')?.priority).toBe('classes');
    });

    it('should infer priority for methods and api', () => {
      const text = `
# API Reference

api content

# Public Methods

method content
`;
      const sections = parseSections(text);
      expect(sections.find((s) => s.title === 'API Reference')?.priority).toBe('functions');
      expect(sections.find((s) => s.title === 'Public Methods')?.priority).toBe('functions');
    });

    it('should infer priority for interfaces and types', () => {
      const text = `
# Interfaces

interface content

# Types

type content
`;
      const sections = parseSections(text);
      expect(sections.find((s) => s.title === 'Interfaces')?.priority).toBe('interfaces');
      expect(sections.find((s) => s.title === 'Types')?.priority).toBe('types');
    });

    it('should infer priority for usage and quick start', () => {
      const text = `
# Usage

usage content

# Quick Start

quick start content
`;
      const sections = parseSections(text);
      expect(sections.find((s) => s.title === 'Usage')?.priority).toBe('examples');
      expect(sections.find((s) => s.title === 'Quick Start')?.priority).toBe('examples');
    });
  });

  describe('prioritizeSections', () => {
    it('should sort sections by priority', () => {
      const sections = [
        { id: 'readme', title: 'Readme', content: '', priority: 'readme' as const, tokens: 10 },
        { id: 'funcs', title: 'Functions', content: '', priority: 'functions' as const, tokens: 10 },
        { id: 'examples', title: 'Examples', content: '', priority: 'examples' as const, tokens: 10 },
      ];

      const sorted = prioritizeSections(sections);
      expect(sorted[0].priority).toBe('functions');
      expect(sorted[1].priority).toBe('examples');
      expect(sorted[2].priority).toBe('readme');
    });

    it('should boost custom priorities', () => {
      const sections = [
        { id: 'readme', title: 'Readme', content: '', priority: 'readme' as const, tokens: 10 },
        { id: 'funcs', title: 'Functions', content: '', priority: 'functions' as const, tokens: 10 },
      ];

      const sorted = prioritizeSections(sections, ['readme']);
      expect(sorted[0].priority).toBe('readme');
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

    it('should include partial sections when space allows', () => {
      const content = `
# Functions

${'function content '.repeat(50)}

# Readme

${'readme content '.repeat(100)}
`;
      const result = truncateToTokenLimit(content, 100, ['functions']);
      expect(result.truncated).toBe(true);
      expect(result.includedSections).toContain('Functions');
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

  describe('tokenUsagePercent', () => {
    it('should calculate percentage', () => {
      expect(tokenUsagePercent(50, 100)).toBe(50);
      expect(tokenUsagePercent(100, 100)).toBe(100);
    });

    it('should cap at 100%', () => {
      expect(tokenUsagePercent(150, 100)).toBe(100);
    });

    it('should return 0 for invalid limit', () => {
      expect(tokenUsagePercent(50, 0)).toBe(0);
      expect(tokenUsagePercent(50, -10)).toBe(0);
    });
  });
});
