/**
 * DTS Parser Plugin tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dtsParserPlugin } from '../../../../src/plugins/core/dts-parser.js';
import type { ExtractorContext } from '../../../../src/types.js';

// Mock the dts parser
vi.mock('../../../../src/parsers/dts.js', () => ({
  parseDts: vi.fn(),
  findMainDtsFile: vi.fn(),
  sortExports: vi.fn((exports) => exports),
}));

import { parseDts, findMainDtsFile, sortExports } from '../../../../src/parsers/dts.js';

const mockedParseDts = vi.mocked(parseDts);
const mockedFindMainDtsFile = vi.mocked(findMainDtsFile);
const mockedSortExports = vi.mocked(sortExports);

describe('dtsParserPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(dtsParserPlugin.name).toBe('dts-parser');
    expect(dtsParserPlugin.version).toBe('1.0.0');
    expect(dtsParserPlugin.category).toBe('parser');
  });

  it('should skip when no .d.ts files found', async () => {
    mockedFindMainDtsFile.mockReturnValue(undefined);

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    // Get the handler
    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['src/index.ts', 'code']]),
      },
      api: [],
      errors: [],
    };

    await handler(context);

    expect(mockedParseDts).not.toHaveBeenCalled();
  });

  it('should parse .d.ts files and add exports', async () => {
    mockedFindMainDtsFile.mockReturnValue('index.d.ts');
    mockedParseDts.mockReturnValue({
      exports: [{ name: 'testFn', kind: 'function', signature: 'function testFn()' }],
      hasTypes: true,
    });

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['index.d.ts', 'declare function testFn(): void;']]),
      },
      api: [],
      errors: [],
    };

    await handler(context);

    expect(mockedParseDts).toHaveBeenCalled();
    expect(context.api).toHaveLength(1);
    expect(context.api![0].name).toBe('testFn');
  });

  it('should deduplicate exports by name', async () => {
    mockedFindMainDtsFile.mockReturnValue('index.d.ts');
    mockedParseDts
      .mockReturnValueOnce({
        exports: [{ name: 'testFn', kind: 'function', signature: 'function testFn()' }],
        hasTypes: true,
      })
      .mockReturnValueOnce({
        exports: [{ name: 'testFn', kind: 'function', signature: 'function testFn()' }],
        hasTypes: true,
      });

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([
          ['index.d.ts', 'declare function testFn(): void;'],
          ['other.d.ts', 'declare function testFn(): void;'],
        ]),
      },
      api: [],
      errors: [],
    };

    await handler(context);

    // Should only have one entry (deduplicated)
    expect(context.api).toHaveLength(1);
  });

  it('should sort .d.ts files with main file first', async () => {
    mockedFindMainDtsFile.mockReturnValue('lib/index.d.ts');
    mockedParseDts.mockReturnValue({
      exports: [],
      hasTypes: true,
    });

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const files = new Map([
      ['other.d.ts', ''],
      ['lib/index.d.ts', ''],
      ['a.d.ts', ''],
    ]);
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files,
      },
      api: [],
      errors: [],
    };

    await handler(context);

    // Check that files were sorted with main file first
    const parseCalls = mockedParseDts.mock.calls;
    expect(parseCalls[0][1]).toBe('lib/index.d.ts');
  });

  it('should prioritize index.d.ts files in sorting', async () => {
    mockedFindMainDtsFile.mockReturnValue('main.d.ts');
    mockedParseDts.mockReturnValue({
      exports: [],
      hasTypes: true,
    });

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const files = new Map([
      ['z.d.ts', ''],
      ['main.d.ts', ''],
      ['src/index.d.ts', ''],
      ['a.d.ts', ''],
    ]);
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files,
      },
      api: [],
      errors: [],
    };

    await handler(context);

    // main.d.ts should be first, then index.d.ts
    const parseCalls = mockedParseDts.mock.calls;
    expect(parseCalls[0][1]).toBe('main.d.ts');
    expect(parseCalls[1][1]).toBe('src/index.d.ts');
  });

  it('should handle parse errors gracefully', async () => {
    mockedFindMainDtsFile.mockReturnValue('index.d.ts');
    mockedParseDts.mockImplementation(() => {
      throw new Error('Parse error');
    });

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['index.d.ts', 'invalid content']]),
      },
      api: [],
      errors: [],
    };

    // Should not throw
    await expect(handler(context)).resolves.not.toThrow();
    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('Parse error');
  });

  it('should handle non-Error parse errors', async () => {
    mockedFindMainDtsFile.mockReturnValue('index.d.ts');
    mockedParseDts.mockImplementation(() => {
      throw 'string error';
    });

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['index.d.ts', 'invalid']]),
      },
      api: [],
      errors: [],
    };

    await handler(context);

    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('string error');
  });

  it('should call sortExports after parsing', async () => {
    mockedFindMainDtsFile.mockReturnValue('index.d.ts');
    mockedParseDts.mockReturnValue({
      exports: [{ name: 'fn', kind: 'function', signature: '' }],
      hasTypes: true,
    });

    const kernel = {
      on: vi.fn(),
    };

    dtsParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['index.d.ts', '']]),
      },
      api: [],
      errors: [],
    };

    await handler(context);

    expect(mockedSortExports).toHaveBeenCalled();
  });
});
