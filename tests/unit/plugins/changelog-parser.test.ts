/**
 * Changelog Parser Plugin Tests
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseChangelog,
  findChangelog,
  getLatestVersion,
  getVersion,
  formatChangelogEntry,
  createChangelogParserPlugin,
} from '../../../src/plugins/optional/changelog-parser.js';
import type { ExtractorContext, ParsedChangelog } from '../../../src/types.js';

describe('parseChangelog', () => {
  it('should parse basic changelog with version headers', () => {
    const content = `# Changelog

## [1.0.0] - 2024-01-15

### Added
- Initial release
- Core functionality

### Fixed
- Bug fix

## [0.9.0] - 2024-01-01

### Added
- Beta features
`;

    const result = parseChangelog(content);

    expect(result.versions).toHaveLength(2);
    expect(result.versions[0]!.version).toBe('1.0.0');
    expect(result.versions[0]!.date).toBe('2024-01-15');
    expect(result.versions[0]!.changes).toHaveLength(3);
    expect(result.versions[0]!.changes[0]).toEqual({
      type: 'added',
      description: 'Initial release',
    });
    expect(result.versions[0]!.changes[2]).toEqual({
      type: 'fixed',
      description: 'Bug fix',
    });
    expect(result.versions[1]!.version).toBe('0.9.0');
  });

  it('should parse version without date', () => {
    const content = `## [2.0.0]

### Changed
- Breaking change
`;

    const result = parseChangelog(content);

    expect(result.versions).toHaveLength(1);
    expect(result.versions[0]!.version).toBe('2.0.0');
    expect(result.versions[0]!.date).toBeUndefined();
  });

  it('should parse version without brackets', () => {
    const content = `## 1.5.0 - 2024-06-15

### Added
- New feature
`;

    const result = parseChangelog(content);

    expect(result.versions).toHaveLength(1);
    expect(result.versions[0]!.version).toBe('1.5.0');
  });

  it('should parse prerelease versions', () => {
    const content = `## [1.0.0-beta.1] - 2024-01-10

### Added
- Beta feature
`;

    const result = parseChangelog(content);

    expect(result.versions[0]!.version).toBe('1.0.0-beta.1');
  });

  it('should parse all change types', () => {
    const content = `## [1.0.0]

### Added
- Added feature

### Changed
- Changed behavior

### Deprecated
- Deprecated method

### Removed
- Removed old API

### Fixed
- Fixed bug

### Security
- Security patch
`;

    const result = parseChangelog(content);
    const changes = result.versions[0]!.changes;

    expect(changes).toHaveLength(6);
    expect(changes[0]!.type).toBe('added');
    expect(changes[1]!.type).toBe('changed');
    expect(changes[2]!.type).toBe('deprecated');
    expect(changes[3]!.type).toBe('removed');
    expect(changes[4]!.type).toBe('fixed');
    expect(changes[5]!.type).toBe('security');
  });

  it('should handle unknown change types as other', () => {
    const content = `## [1.0.0]

### Custom
- Custom change
`;

    const result = parseChangelog(content);

    expect(result.versions[0]!.changes[0]!.type).toBe('other');
  });

  it('should parse bullet points with asterisk', () => {
    const content = `## [1.0.0]

### Added
* Feature with asterisk
- Feature with dash
`;

    const result = parseChangelog(content);

    expect(result.versions[0]!.changes).toHaveLength(2);
    expect(result.versions[0]!.changes[0]!.description).toBe('Feature with asterisk');
    expect(result.versions[0]!.changes[1]!.description).toBe('Feature with dash');
  });

  it('should return empty versions array for empty content', () => {
    const result = parseChangelog('');

    expect(result.versions).toHaveLength(0);
  });

  it('should handle changelog with no version headers', () => {
    const content = `# Changelog

This is just some text without versions.
`;

    const result = parseChangelog(content);

    expect(result.versions).toHaveLength(0);
  });
});

describe('findChangelog', () => {
  it('should find CHANGELOG.md', () => {
    const files = new Map([
      ['README.md', 'readme content'],
      ['CHANGELOG.md', 'changelog content'],
    ]);

    expect(findChangelog(files)).toBe('changelog content');
  });

  it('should find lowercase changelog.md', () => {
    const files = new Map([['changelog.md', 'changelog content']]);

    expect(findChangelog(files)).toBe('changelog content');
  });

  it('should find HISTORY.md', () => {
    const files = new Map([['HISTORY.md', 'history content']]);

    expect(findChangelog(files)).toBe('history content');
  });

  it('should find CHANGES.md', () => {
    const files = new Map([['CHANGES.md', 'changes content']]);

    expect(findChangelog(files)).toBe('changes content');
  });

  it('should find changelog without extension', () => {
    const files = new Map([['CHANGELOG', 'changelog content']]);

    expect(findChangelog(files)).toBe('changelog content');
  });

  it('should find changelog with package/ prefix', () => {
    const files = new Map([['package/CHANGELOG.md', 'changelog content']]);

    expect(findChangelog(files)).toBe('changelog content');
  });

  it('should return undefined if no changelog found', () => {
    const files = new Map([
      ['README.md', 'readme'],
      ['index.js', 'code'],
    ]);

    expect(findChangelog(files)).toBeUndefined();
  });

  it('should prioritize CHANGELOG.md over others', () => {
    const files = new Map([
      ['HISTORY.md', 'history content'],
      ['CHANGELOG.md', 'changelog content'],
    ]);

    expect(findChangelog(files)).toBe('changelog content');
  });
});

describe('getLatestVersion', () => {
  it('should return first version entry', () => {
    const changelog: ParsedChangelog = {
      versions: [
        { version: '2.0.0', changes: [] },
        { version: '1.0.0', changes: [] },
      ],
    };

    expect(getLatestVersion(changelog)?.version).toBe('2.0.0');
  });

  it('should return undefined for empty changelog', () => {
    const changelog: ParsedChangelog = { versions: [] };

    expect(getLatestVersion(changelog)).toBeUndefined();
  });
});

describe('getVersion', () => {
  it('should find specific version', () => {
    const changelog: ParsedChangelog = {
      versions: [
        { version: '2.0.0', changes: [] },
        { version: '1.0.0', date: '2024-01-01', changes: [{ type: 'added', description: 'test' }] },
      ],
    };

    const result = getVersion(changelog, '1.0.0');

    expect(result?.version).toBe('1.0.0');
    expect(result?.date).toBe('2024-01-01');
  });

  it('should return undefined for non-existent version', () => {
    const changelog: ParsedChangelog = {
      versions: [{ version: '1.0.0', changes: [] }],
    };

    expect(getVersion(changelog, '2.0.0')).toBeUndefined();
  });
});

describe('formatChangelogEntry', () => {
  it('should format entry with date', () => {
    const entry = {
      version: '1.0.0',
      date: '2024-01-15',
      changes: [
        { type: 'added' as const, description: 'New feature' },
        { type: 'fixed' as const, description: 'Bug fix' },
      ],
    };

    const result = formatChangelogEntry(entry);

    expect(result).toContain('## 1.0.0 (2024-01-15)');
    expect(result).toContain('### Added');
    expect(result).toContain('- New feature');
    expect(result).toContain('### Fixed');
    expect(result).toContain('- Bug fix');
  });

  it('should format entry without date', () => {
    const entry = {
      version: '1.0.0',
      changes: [{ type: 'added' as const, description: 'New feature' }],
    };

    const result = formatChangelogEntry(entry);

    expect(result).toContain('## 1.0.0');
    expect(result).not.toContain('(');
  });

  it('should group changes by type', () => {
    const entry = {
      version: '1.0.0',
      changes: [
        { type: 'added' as const, description: 'Feature 1' },
        { type: 'fixed' as const, description: 'Bug 1' },
        { type: 'added' as const, description: 'Feature 2' },
      ],
    };

    const result = formatChangelogEntry(entry);
    const addedIndex = result.indexOf('### Added');
    const fixedIndex = result.indexOf('### Fixed');
    const feature1Index = result.indexOf('- Feature 1');
    const feature2Index = result.indexOf('- Feature 2');

    // Both features should be under Added section
    expect(feature1Index).toBeGreaterThan(addedIndex);
    expect(feature2Index).toBeGreaterThan(addedIndex);
    expect(feature1Index).toBeLessThan(fixedIndex);
  });

  it('should handle other type', () => {
    const entry = {
      version: '1.0.0',
      changes: [{ type: 'other' as const, description: 'Miscellaneous' }],
    };

    const result = formatChangelogEntry(entry);

    expect(result).toContain('### Other');
    expect(result).toContain('- Miscellaneous');
  });
});

describe('createChangelogParserPlugin', () => {
  it('should create a valid plugin', () => {
    const plugin = createChangelogParserPlugin();

    expect(plugin.name).toBe('changelog-parser');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('parser');
    expect(typeof plugin.install).toBe('function');
  });

  it('should register parse:changelog handler', () => {
    const plugin = createChangelogParserPlugin();
    const handlers: Record<string, Function> = {};

    const mockKernel = {
      on: vi.fn((event: string, handler: Function) => {
        handlers[event] = handler;
      }),
    };

    plugin.install(mockKernel as any);

    expect(mockKernel.on).toHaveBeenCalledWith('parse:changelog', expect.any(Function));
    expect(handlers['parse:changelog']).toBeDefined();
  });

  it('should parse changelog when handler is called', async () => {
    const plugin = createChangelogParserPlugin();
    let handler: Function | undefined;

    const mockKernel = {
      on: vi.fn((event: string, h: Function) => {
        if (event === 'parse:changelog') {
          handler = h;
        }
      }),
    };

    plugin.install(mockKernel as any);

    const changelogContent = `## [1.0.0]

### Added
- Test feature
`;

    const ctx: Partial<ExtractorContext> = {
      package: {
        name: 'test-pkg',
        version: '1.0.0',
        tarball: 'http://test.com/test.tgz',
        files: new Map([['CHANGELOG.md', changelogContent]]),
      },
    };

    await handler!(ctx);

    expect(ctx.changelog).toBeDefined();
    expect(ctx.changelog!.versions).toHaveLength(1);
    expect(ctx.changelog!.versions[0]!.version).toBe('1.0.0');
  });

  it('should not set changelog if no changelog file found', async () => {
    const plugin = createChangelogParserPlugin();
    let handler: Function | undefined;

    const mockKernel = {
      on: vi.fn((event: string, h: Function) => {
        if (event === 'parse:changelog') {
          handler = h;
        }
      }),
    };

    plugin.install(mockKernel as any);

    const ctx: Partial<ExtractorContext> = {
      package: {
        name: 'test-pkg',
        version: '1.0.0',
        tarball: 'http://test.com/test.tgz',
        files: new Map([['README.md', 'readme']]),
      },
    };

    await handler!(ctx);

    expect(ctx.changelog).toBeUndefined();
  });
});
