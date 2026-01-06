/**
 * Tests for src/cli/args.ts
 */

import { describe, it, expect } from 'vitest';
import { parseArgs, getHelpText, getVersion } from '../../../src/cli/args.js';

describe('parseArgs', () => {
  describe('commands', () => {
    it('should default to help command when no args', () => {
      const result = parseArgs([]);
      expect(result.command).toBe('help');
    });

    it('should parse --help flag', () => {
      const result = parseArgs(['--help']);
      expect(result.command).toBe('help');
    });

    it('should parse -h flag', () => {
      const result = parseArgs(['-h']);
      expect(result.command).toBe('help');
    });

    it('should parse --version flag', () => {
      const result = parseArgs(['--version']);
      expect(result.command).toBe('version');
    });

    it('should parse -v flag', () => {
      const result = parseArgs(['-v']);
      expect(result.command).toBe('version');
    });

    it('should parse -V flag', () => {
      const result = parseArgs(['-V']);
      expect(result.command).toBe('version');
    });

    it('should parse cache-clear command', () => {
      const result = parseArgs(['cache-clear']);
      expect(result.command).toBe('cache-clear');
    });

    it('should parse cache:clear command', () => {
      const result = parseArgs(['cache:clear']);
      expect(result.command).toBe('cache-clear');
    });

    it('should parse extract command', () => {
      const result = parseArgs(['extract', 'lodash']);
      expect(result.command).toBe('extract');
      expect(result.package).toBe('lodash');
    });

    it('should parse help command with subcommand', () => {
      const result = parseArgs(['help', 'extract']);
      expect(result.command).toBe('help');
      expect(result.helpCommand).toBe('extract');
    });
  });

  describe('package argument', () => {
    it('should parse package name', () => {
      const result = parseArgs(['lodash']);
      expect(result.package).toBe('lodash');
    });

    it('should parse scoped package', () => {
      const result = parseArgs(['@babel/core']);
      expect(result.package).toBe('@babel/core');
    });

    it('should parse package with version', () => {
      const result = parseArgs(['lodash@4.17.21']);
      expect(result.package).toBe('lodash@4.17.21');
    });
  });

  describe('format options', () => {
    it('should parse -f flag with single format', () => {
      const result = parseArgs(['lodash', '-f', 'llms']);
      expect(result.formats).toEqual(['llms']);
    });

    it('should parse --format flag with multiple formats', () => {
      const result = parseArgs(['lodash', '--format', 'llms,json']);
      expect(result.formats).toEqual(['llms', 'json']);
    });

    it('should filter invalid formats', () => {
      const result = parseArgs(['lodash', '-f', 'llms,invalid,json']);
      expect(result.formats).toEqual(['llms', 'json']);
    });

    it('should parse --llms shortcut', () => {
      const result = parseArgs(['lodash', '--llms']);
      expect(result.formats).toEqual(['llms']);
    });

    it('should parse --llms-full shortcut', () => {
      const result = parseArgs(['lodash', '--llms-full']);
      expect(result.formats).toEqual(['llms-full']);
    });

    it('should parse --markdown shortcut', () => {
      const result = parseArgs(['lodash', '--markdown']);
      expect(result.formats).toEqual(['markdown']);
    });

    it('should parse --md shortcut', () => {
      const result = parseArgs(['lodash', '--md']);
      expect(result.formats).toEqual(['markdown']);
    });

    it('should parse --json shortcut', () => {
      const result = parseArgs(['lodash', '--json']);
      expect(result.formats).toEqual(['json']);
    });

    it('should parse --all shortcut', () => {
      const result = parseArgs(['lodash', '--all']);
      expect(result.formats).toEqual(['llms', 'llms-full', 'markdown', 'json']);
    });
  });

  describe('output options', () => {
    it('should parse -o flag', () => {
      const result = parseArgs(['lodash', '-o', './docs']);
      expect(result.output).toBe('./docs');
    });

    it('should parse --output flag', () => {
      const result = parseArgs(['lodash', '--output', '/path/to/output']);
      expect(result.output).toBe('/path/to/output');
    });

    it('should default output to current directory', () => {
      const result = parseArgs(['lodash']);
      expect(result.output).toBe('.');
    });

    it('should default output when no value provided', () => {
      const result = parseArgs(['lodash', '-o']);
      expect(result.output).toBe('.');
    });
  });

  describe('token limit', () => {
    it('should parse -t flag', () => {
      const result = parseArgs(['lodash', '-t', '1000']);
      expect(result.tokenLimit).toBe(1000);
    });

    it('should parse --token-limit flag', () => {
      const result = parseArgs(['lodash', '--token-limit', '5000']);
      expect(result.tokenLimit).toBe(5000);
    });

    it('should use default for invalid value', () => {
      const result = parseArgs(['lodash', '-t', 'invalid']);
      expect(result.tokenLimit).toBe(2000);
    });

    it('should use default for negative value', () => {
      const result = parseArgs(['lodash', '-t', '-100']);
      expect(result.tokenLimit).toBe(2000);
    });
  });

  describe('priorities', () => {
    it('should parse -p flag', () => {
      const result = parseArgs(['lodash', '-p', 'functions,examples']);
      expect(result.priorities).toEqual(['functions', 'examples']);
    });

    it('should parse --prioritize flag', () => {
      const result = parseArgs(['lodash', '--prioritize', 'classes,types']);
      expect(result.priorities).toEqual(['classes', 'types']);
    });

    it('should filter invalid priorities', () => {
      const result = parseArgs(['lodash', '-p', 'functions,invalid,types']);
      expect(result.priorities).toEqual(['functions', 'types']);
    });
  });

  describe('AI options', () => {
    it('should parse --ai flag', () => {
      const result = parseArgs(['lodash', '--ai', 'claude']);
      expect(result.ai).toBe('claude');
      expect(result.enrichWithAI).toBe(true);
    });

    it('should parse --ai-key flag', () => {
      const result = parseArgs(['lodash', '--ai-key', 'sk-xxx']);
      expect(result.aiKey).toBe('sk-xxx');
    });

    it('should parse --ai-model flag', () => {
      const result = parseArgs(['lodash', '--ai-model', 'claude-3-opus']);
      expect(result.aiModel).toBe('claude-3-opus');
    });

    it('should parse --enrich flag', () => {
      const result = parseArgs(['lodash', '--enrich']);
      expect(result.enrichWithAI).toBe(true);
    });

    it('should ignore invalid AI provider', () => {
      const result = parseArgs(['lodash', '--ai', 'invalid-provider']);
      expect(result.ai).toBeUndefined();
      expect(result.enrichWithAI).toBe(false);
    });
  });

  describe('cache options', () => {
    it('should parse --no-cache flag', () => {
      const result = parseArgs(['lodash', '--no-cache']);
      expect(result.cache).toBe(false);
    });

    it('should parse --cache-dir flag', () => {
      const result = parseArgs(['lodash', '--cache-dir', './my-cache']);
      expect(result.cacheDir).toBe('./my-cache');
    });

    it('should parse --ignore-cache flag', () => {
      const result = parseArgs(['lodash', '--ignore-cache']);
      expect(result.ignoreCache).toBe(true);
    });

    it('should parse --fresh flag as ignore cache', () => {
      const result = parseArgs(['lodash', '--fresh']);
      expect(result.ignoreCache).toBe(true);
    });

    it('should default cache-dir when no value provided', () => {
      const result = parseArgs(['lodash', '--cache-dir']);
      expect(result.cacheDir).toBe('.npm-llms-cache');
    });
  });

  describe('output flags', () => {
    it('should parse --verbose flag', () => {
      const result = parseArgs(['lodash', '--verbose']);
      expect(result.verbose).toBe(true);
    });

    it('should parse -V flag for verbose (when not first arg)', () => {
      const result = parseArgs(['lodash', '-V']);
      expect(result.verbose).toBe(true);
    });

    it('should parse --stdout flag', () => {
      const result = parseArgs(['lodash', '--stdout']);
      expect(result.stdout).toBe(true);
    });
  });

  describe('help and version in middle of args', () => {
    it('should handle -h flag in middle', () => {
      const result = parseArgs(['lodash', '-h']);
      expect(result.command).toBe('help');
    });

    it('should handle --version flag in middle', () => {
      const result = parseArgs(['lodash', '--version']);
      expect(result.command).toBe('version');
    });
  });

  describe('default values', () => {
    it('should have correct defaults', () => {
      const result = parseArgs(['lodash']);
      expect(result.formats).toEqual(['llms', 'llms-full', 'markdown', 'json']);
      expect(result.output).toBe('.');
      expect(result.tokenLimit).toBe(2000);
      expect(result.priorities).toEqual(['functions', 'examples']);
      expect(result.enrichWithAI).toBe(false);
      expect(result.cache).toBe(true);
      expect(result.cacheDir).toBe('.npm-llms-cache');
      expect(result.ignoreCache).toBe(false);
      expect(result.verbose).toBe(false);
      expect(result.stdout).toBe(false);
    });
  });

  describe('complex argument combinations', () => {
    it('should parse multiple options', () => {
      const result = parseArgs([
        'zod@3.22.0',
        '-f', 'llms,json',
        '-o', './docs',
        '-t', '3000',
        '--ai', 'openai',
        '--ai-key', 'sk-test',
        '--verbose',
      ]);

      expect(result.package).toBe('zod@3.22.0');
      expect(result.formats).toEqual(['llms', 'json']);
      expect(result.output).toBe('./docs');
      expect(result.tokenLimit).toBe(3000);
      expect(result.ai).toBe('openai');
      expect(result.aiKey).toBe('sk-test');
      expect(result.verbose).toBe(true);
    });
  });
});

describe('getHelpText', () => {
  it('should return general help when no command specified', () => {
    const help = getHelpText();
    expect(help).toContain('npm-llms');
    expect(help).toContain('extract');
    expect(help).toContain('cache-clear');
    expect(help).toContain('help');
    expect(help).toContain('version');
  });

  it('should return extract command help', () => {
    const help = getHelpText('extract');
    expect(help).toContain('extract');
    expect(help).toContain('--format');
    expect(help).toContain('--output');
    expect(help).toContain('--token-limit');
    expect(help).toContain('--ai');
  });

  it('should return cache-clear command help', () => {
    const help = getHelpText('cache-clear');
    expect(help).toContain('cache-clear');
    expect(help).toContain('--cache-dir');
  });
});

describe('getVersion', () => {
  it('should return version string', () => {
    const version = getVersion();
    expect(version).toBe('1.0.0');
  });
});
