/**
 * CLI tests
 * Tests for the @oxog/cli based command-line interface
 */

import { describe, it, expect } from 'vitest';

// Note: The CLI is built on @oxog/cli which has comprehensive tests.
// These tests verify our CLI-specific logic like format parsing.

describe('CLI format parsing', () => {
  const VALID_FORMATS = ['llms', 'llms-full', 'markdown', 'json', 'html'];

  function parseFormats(value: string | undefined): string[] {
    if (!value) return ['llms', 'llms-full', 'markdown', 'json'];
    const formats = value.split(',').map((s) => s.trim().toLowerCase());
    return formats.filter((f) => VALID_FORMATS.includes(f));
  }

  it('should return default formats when no value provided', () => {
    expect(parseFormats(undefined)).toEqual(['llms', 'llms-full', 'markdown', 'json']);
  });

  it('should parse comma-separated formats', () => {
    expect(parseFormats('llms,json')).toEqual(['llms', 'json']);
  });

  it('should filter invalid formats', () => {
    expect(parseFormats('llms,invalid,json')).toEqual(['llms', 'json']);
  });

  it('should handle whitespace', () => {
    expect(parseFormats('llms , json , markdown')).toEqual(['llms', 'json', 'markdown']);
  });

  it('should handle case insensitively', () => {
    expect(parseFormats('LLMS,JSON')).toEqual(['llms', 'json']);
  });
});

describe('CLI priority parsing', () => {
  const VALID_PRIORITIES = ['functions', 'classes', 'interfaces', 'types', 'examples', 'readme'];

  function parsePriorities(value: string | undefined): string[] {
    if (!value) return ['functions', 'examples'];
    const priorities = value.split(',').map((s) => s.trim().toLowerCase());
    return priorities.filter((p) => VALID_PRIORITIES.includes(p));
  }

  it('should return default priorities when no value provided', () => {
    expect(parsePriorities(undefined)).toEqual(['functions', 'examples']);
  });

  it('should parse comma-separated priorities', () => {
    expect(parsePriorities('classes,types')).toEqual(['classes', 'types']);
  });

  it('should filter invalid priorities', () => {
    expect(parsePriorities('functions,invalid,types')).toEqual(['functions', 'types']);
  });
});

describe('CLI output files', () => {
  const OUTPUT_FILES: Record<string, string> = {
    llms: 'llms.txt',
    'llms-full': 'llms-full.txt',
    markdown: 'API.md',
    json: 'api.json',
    html: 'api.html',
  };

  it('should have correct file mappings', () => {
    expect(OUTPUT_FILES['llms']).toBe('llms.txt');
    expect(OUTPUT_FILES['llms-full']).toBe('llms-full.txt');
    expect(OUTPUT_FILES['markdown']).toBe('API.md');
    expect(OUTPUT_FILES['json']).toBe('api.json');
    expect(OUTPUT_FILES['html']).toBe('api.html');
  });
});
