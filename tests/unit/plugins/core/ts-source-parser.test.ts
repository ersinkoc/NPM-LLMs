/**
 * TypeScript Source Parser Plugin tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tsSourceParserPlugin } from '../../../../src/plugins/core/ts-source-parser.js';
import type { ExtractorContext } from '../../../../src/types.js';

// Mock the typescript parser
vi.mock('../../../../src/parsers/typescript.js', () => ({
  parseTypeScript: vi.fn(),
  findTypeScriptFiles: vi.fn(),
}));

vi.mock('../../../../src/parsers/dts.js', () => ({
  sortExports: vi.fn((exports) => exports),
}));

import { parseTypeScript, findTypeScriptFiles } from '../../../../src/parsers/typescript.js';
import { sortExports } from '../../../../src/parsers/dts.js';

const mockedParseTypeScript = vi.mocked(parseTypeScript);
const mockedFindTypeScriptFiles = vi.mocked(findTypeScriptFiles);
const mockedSortExports = vi.mocked(sortExports);

describe('tsSourceParserPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(tsSourceParserPlugin.name).toBe('ts-source-parser');
    expect(tsSourceParserPlugin.version).toBe('1.0.0');
    expect(tsSourceParserPlugin.category).toBe('parser');
  });

  it('should skip when api already has entries', async () => {
    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [{ name: 'existing', kind: 'function', signature: '' }],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map(),
      },
    };

    await handler(context);

    expect(mockedFindTypeScriptFiles).not.toHaveBeenCalled();
  });

  it('should skip when no TypeScript files found', async () => {
    mockedFindTypeScriptFiles.mockReturnValue([]);

    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map([['package.json', '{}']]),
      },
      errors: [],
    };

    await handler(context);

    expect(mockedParseTypeScript).not.toHaveBeenCalled();
  });

  it('should parse TypeScript files and add exports', async () => {
    mockedFindTypeScriptFiles.mockReturnValue(['src/index.ts']);
    mockedParseTypeScript.mockReturnValue({
      exports: [{ name: 'testFn', kind: 'function', signature: 'function testFn()' }],
      hasTypes: true,
    });

    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map([['src/index.ts', 'export function testFn() {}']]),
      },
      errors: [],
    };

    await handler(context);

    expect(mockedParseTypeScript).toHaveBeenCalledWith('export function testFn() {}', 'src/index.ts');
    expect(context.api).toHaveLength(1);
    expect(context.api![0].name).toBe('testFn');
  });

  it('should deduplicate exports by name', async () => {
    mockedFindTypeScriptFiles.mockReturnValue(['src/a.ts', 'src/b.ts']);
    mockedParseTypeScript
      .mockReturnValueOnce({
        exports: [{ name: 'shared', kind: 'function', signature: '' }],
        hasTypes: false,
      })
      .mockReturnValueOnce({
        exports: [{ name: 'shared', kind: 'function', signature: '' }],
        hasTypes: false,
      });

    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map([
          ['src/a.ts', 'code'],
          ['src/b.ts', 'code'],
        ]),
      },
      errors: [],
    };

    await handler(context);

    expect(context.api).toHaveLength(1);
  });

  it('should handle parse errors gracefully', async () => {
    mockedFindTypeScriptFiles.mockReturnValue(['src/index.ts']);
    mockedParseTypeScript.mockImplementation(() => {
      throw new Error('Parse error');
    });

    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map([['src/index.ts', 'invalid code']]),
      },
      errors: [],
    };

    await expect(handler(context)).resolves.not.toThrow();
    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('Parse error');
  });

  it('should handle non-Error parse errors', async () => {
    mockedFindTypeScriptFiles.mockReturnValue(['src/index.ts']);
    mockedParseTypeScript.mockImplementation(() => {
      throw 'string error';
    });

    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map([['src/index.ts', 'code']]),
      },
      errors: [],
    };

    await handler(context);

    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('string error');
  });

  it('should skip files without content', async () => {
    mockedFindTypeScriptFiles.mockReturnValue(['src/index.ts', 'src/missing.ts']);
    mockedParseTypeScript.mockReturnValue({
      exports: [{ name: 'fn', kind: 'function', signature: '' }],
      hasTypes: false,
    });

    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map([['src/index.ts', 'code']]), // missing.ts not in map
      },
      errors: [],
    };

    await handler(context);

    expect(mockedParseTypeScript).toHaveBeenCalledTimes(1);
  });

  it('should call sortExports after parsing', async () => {
    mockedFindTypeScriptFiles.mockReturnValue(['src/index.ts']);
    mockedParseTypeScript.mockReturnValue({
      exports: [{ name: 'fn', kind: 'function', signature: '' }],
      hasTypes: false,
    });

    const kernel = {
      on: vi.fn(),
    };

    tsSourceParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      api: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map([['src/index.ts', 'code']]),
      },
      errors: [],
    };

    await handler(context);

    expect(mockedSortExports).toHaveBeenCalled();
  });
});
