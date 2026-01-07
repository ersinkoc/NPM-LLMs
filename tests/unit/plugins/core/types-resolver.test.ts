/**
 * Types Resolver Plugin tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { typesResolverPlugin } from '../../../../src/plugins/core/types-resolver.js';
import type { ExtractorContext } from '../../../../src/types.js';

// Mock the fetcher
vi.mock('../../../../src/core/fetcher.js', () => ({
  fetchPackage: vi.fn(),
}));

import { fetchPackage } from '../../../../src/core/fetcher.js';

const mockedFetchPackage = vi.mocked(fetchPackage);

describe('typesResolverPlugin', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should have correct metadata', () => {
    expect(typesResolverPlugin.name).toBe('types-resolver');
    expect(typesResolverPlugin.version).toBe('1.0.0');
    expect(typesResolverPlugin.category).toBe('parser');
  });

  it('should skip @types packages', async () => {
    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: '@types/lodash',
        version: '1.0.0',
        files: new Map([['package.json', '{}']]),
      },
    };

    await handler(context);

    expect(mockedFetchPackage).not.toHaveBeenCalled();
  });

  it('should skip packages with existing .d.ts files', async () => {
    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'lodash',
        version: '1.0.0',
        files: new Map([
          ['package.json', '{}'],
          ['index.d.ts', 'declare module "lodash"'],
        ]),
      },
    };

    await handler(context);

    expect(mockedFetchPackage).not.toHaveBeenCalled();
  });

  it('should fetch @types package for regular packages', async () => {
    mockedFetchPackage.mockResolvedValue({
      name: '@types/lodash',
      version: '4.0.0',
      files: new Map([['index.d.ts', 'declare module "lodash"']]),
    });

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const files = new Map([['package.json', '{}']]);
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'lodash',
        version: '1.0.0',
        files,
      },
    };

    await handler(context);

    expect(mockedFetchPackage).toHaveBeenCalledWith('@types/lodash');
    expect(files.has('__types__/index.d.ts')).toBe(true);
  });

  it('should fetch @types package for scoped packages', async () => {
    mockedFetchPackage.mockResolvedValue({
      name: '@types/babel__core',
      version: '7.0.0',
      files: new Map([['index.d.ts', 'declare module "@babel/core"']]),
    });

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const files = new Map([['package.json', '{}']]);
    const context: Partial<ExtractorContext> = {
      package: {
        name: '@babel/core',
        version: '7.0.0',
        files,
      },
    };

    await handler(context);

    expect(mockedFetchPackage).toHaveBeenCalledWith('@types/babel__core');
  });

  it('should merge .d.ts files with __types__ prefix', async () => {
    mockedFetchPackage.mockResolvedValue({
      name: '@types/lodash',
      version: '4.0.0',
      files: new Map([
        ['index.d.ts', 'declare module "lodash"'],
        ['common.d.ts', 'declare interface Common {}'],
        ['package.json', '{}'],
      ]),
    });

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const files = new Map([['package.json', '{}']]);
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'lodash',
        version: '1.0.0',
        files,
      },
    };

    await handler(context);

    expect(files.has('__types__/index.d.ts')).toBe(true);
    expect(files.has('__types__/common.d.ts')).toBe(true);
    expect(files.has('__types__/package.json')).toBe(false);
  });

  it('should set types entry point from @types package', async () => {
    mockedFetchPackage.mockResolvedValue({
      name: '@types/lodash',
      version: '4.0.0',
      files: new Map([['index.d.ts', 'declare module "lodash"']]),
      types: 'index.d.ts',
    });

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'lodash',
        version: '1.0.0',
        files: new Map([['package.json', '{}']]),
        types: undefined,
      },
    };

    await handler(context);

    expect(context.package!.types).toBe('__types__/index.d.ts');
  });

  it('should not override existing types entry point', async () => {
    mockedFetchPackage.mockResolvedValue({
      name: '@types/lodash',
      version: '4.0.0',
      files: new Map([['index.d.ts', 'declare module "lodash"']]),
      types: 'index.d.ts',
    });

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'lodash',
        version: '1.0.0',
        files: new Map([['package.json', '{}']]),
        types: 'existing.d.ts',
      },
    };

    await handler(context);

    expect(context.package!.types).toBe('existing.d.ts');
  });

  it('should log when types are merged', async () => {
    mockedFetchPackage.mockResolvedValue({
      name: '@types/lodash',
      version: '4.0.0',
      files: new Map([
        ['index.d.ts', 'declare module "lodash"'],
        ['common.d.ts', 'declare interface Common {}'],
      ]),
    });

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'lodash',
        version: '1.0.0',
        files: new Map([['package.json', '{}']]),
      },
    };

    await handler(context);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[types-resolver] Merged 2 .d.ts files from @types/lodash')
    );
  });

  it('should silently continue when @types package not found', async () => {
    mockedFetchPackage.mockRejectedValue(new Error('Package not found'));

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const files = new Map([['package.json', '{}']]);
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'my-custom-package',
        version: '1.0.0',
        files,
      },
    };

    // Should not throw
    await expect(handler(context)).resolves.not.toThrow();
    // Files should not be modified
    expect(files.size).toBe(1);
  });

  it('should not log when no types are merged', async () => {
    mockedFetchPackage.mockResolvedValue({
      name: '@types/lodash',
      version: '4.0.0',
      files: new Map([['package.json', '{}']]),
    });

    const kernel = {
      on: vi.fn(),
    };

    typesResolverPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'lodash',
        version: '1.0.0',
        files: new Map([['package.json', '{}']]),
      },
    };

    await handler(context);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
