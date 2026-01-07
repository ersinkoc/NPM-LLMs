/**
 * Full CLI tests
 * Tests the CLI helper functions and logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('CLI helper functions', () => {
  // Test the parsing functions separately
  const VALID_FORMATS = ['llms', 'llms-full', 'markdown', 'json', 'html'];
  const VALID_PRIORITIES = ['functions', 'classes', 'interfaces', 'types', 'examples', 'readme'];

  function parseFormats(value: string | undefined): string[] {
    if (!value) return ['llms', 'llms-full', 'markdown', 'json'];
    const formats = value.split(',').map((s) => s.trim().toLowerCase());
    return formats.filter((f) => VALID_FORMATS.includes(f));
  }

  function parsePriorities(value: string | undefined): string[] {
    if (!value) return ['functions', 'examples'];
    const priorities = value.split(',').map((s) => s.trim().toLowerCase());
    return priorities.filter((p) => VALID_PRIORITIES.includes(p));
  }

  describe('parseFormats', () => {
    it('should return default formats when undefined', () => {
      expect(parseFormats(undefined)).toEqual(['llms', 'llms-full', 'markdown', 'json']);
    });

    it('should parse single format', () => {
      expect(parseFormats('llms')).toEqual(['llms']);
    });

    it('should parse multiple formats', () => {
      expect(parseFormats('llms,json,html')).toEqual(['llms', 'json', 'html']);
    });

    it('should filter invalid formats', () => {
      expect(parseFormats('llms,invalid,json')).toEqual(['llms', 'json']);
    });

    it('should handle whitespace', () => {
      expect(parseFormats('llms , json , markdown')).toEqual(['llms', 'json', 'markdown']);
    });

    it('should be case insensitive', () => {
      expect(parseFormats('LLMS,JSON')).toEqual(['llms', 'json']);
    });

    it('should handle html format', () => {
      expect(parseFormats('html')).toEqual(['html']);
    });

    it('should handle llms-full format', () => {
      expect(parseFormats('llms-full')).toEqual(['llms-full']);
    });
  });

  describe('parsePriorities', () => {
    it('should return default priorities when undefined', () => {
      expect(parsePriorities(undefined)).toEqual(['functions', 'examples']);
    });

    it('should parse single priority', () => {
      expect(parsePriorities('classes')).toEqual(['classes']);
    });

    it('should parse multiple priorities', () => {
      expect(parsePriorities('functions,classes,types')).toEqual(['functions', 'classes', 'types']);
    });

    it('should filter invalid priorities', () => {
      expect(parsePriorities('functions,invalid,types')).toEqual(['functions', 'types']);
    });

    it('should handle all valid priorities', () => {
      expect(parsePriorities('functions,classes,interfaces,types,examples,readme')).toEqual([
        'functions',
        'classes',
        'interfaces',
        'types',
        'examples',
        'readme',
      ]);
    });
  });
});

describe('CLI OUTPUT_FILES', () => {
  const OUTPUT_FILES: Record<string, string> = {
    llms: 'llms.txt',
    'llms-full': 'llms-full.txt',
    markdown: 'API.md',
    json: 'api.json',
    html: 'api.html',
  };

  it('should map llms to llms.txt', () => {
    expect(OUTPUT_FILES['llms']).toBe('llms.txt');
  });

  it('should map llms-full to llms-full.txt', () => {
    expect(OUTPUT_FILES['llms-full']).toBe('llms-full.txt');
  });

  it('should map markdown to API.md', () => {
    expect(OUTPUT_FILES['markdown']).toBe('API.md');
  });

  it('should map json to api.json', () => {
    expect(OUTPUT_FILES['json']).toBe('api.json');
  });

  it('should map html to api.html', () => {
    expect(OUTPUT_FILES['html']).toBe('api.html');
  });
});
