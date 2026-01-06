/**
 * Tests for src/core/extractor.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createExtractor, extract } from '../../../src/core/extractor.js';
import type { Plugin, ExtractorContext } from '../../../src/types.js';

// Mock the fetcher module
vi.mock('../../../src/core/fetcher.js', () => ({
  fetchPackage: vi.fn().mockResolvedValue({
    name: 'test-package',
    version: '1.0.0',
    description: 'A test package',
    tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz',
    types: undefined,
    main: 'index.js',
    exports: undefined,
    repository: undefined,
    keywords: ['test'],
    author: 'Test Author',
    license: 'MIT',
    homepage: undefined,
    files: new Map([
      ['README.md', '# Test Package\n\nThis is a test.'],
      ['package.json', JSON.stringify({ name: 'test-package', version: '1.0.0' })],
    ]),
  }),
  parsePackageSpec: vi.fn().mockImplementation((spec: string) => {
    const [name, version] = spec.split('@');
    return { name: name || spec, version };
  }),
}));

describe('createExtractor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create an extractor with default options', () => {
    const extractor = createExtractor();

    expect(extractor).toBeDefined();
    expect(extractor.extract).toBeInstanceOf(Function);
    expect(extractor.fetch).toBeInstanceOf(Function);
    expect(extractor.use).toBeInstanceOf(Function);
    expect(extractor.unregister).toBeInstanceOf(Function);
    expect(extractor.listPlugins).toBeInstanceOf(Function);
    expect(extractor.clearCache).toBeInstanceOf(Function);
    expect(extractor.getCacheStats).toBeInstanceOf(Function);
  });

  it('should register core plugins by default', () => {
    const extractor = createExtractor();
    const plugins = extractor.listPlugins();

    expect(plugins.length).toBeGreaterThan(0);
    expect(plugins.some(p => p.name === 'llms-output')).toBe(true);
    expect(plugins.some(p => p.name === 'dts-parser')).toBe(true);
    expect(plugins.some(p => p.name === 'readme-parser')).toBe(true);
  });

  it('should accept custom plugins in options', () => {
    const customPlugin: Plugin = {
      name: 'custom-plugin',
      version: '1.0.0',
      category: 'utility',
      install: vi.fn(),
    };

    const extractor = createExtractor({ plugins: [customPlugin] });
    const plugins = extractor.listPlugins();

    expect(plugins.some(p => p.name === 'custom-plugin')).toBe(true);
    expect(customPlugin.install).toHaveBeenCalled();
  });

  it('should disable cache when cache.enabled is false', async () => {
    const extractor = createExtractor({ cache: { enabled: false } });
    const stats = await extractor.getCacheStats();

    expect(stats.entries).toBe(0);
    expect(stats.size).toBe(0);
  });
});

describe('extractor.extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract documentation from a package', async () => {
    const extractor = createExtractor({ cache: { enabled: false } });
    const result = await extractor.extract('test-package');

    expect(result).toBeDefined();
    expect(result.package.name).toBe('test-package');
    expect(result.package.version).toBe('1.0.0');
    expect(result.api).toBeInstanceOf(Array);
    expect(result.outputs).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.fromCache).toBe(false);
  });

  it('should respect custom formats option', async () => {
    const extractor = createExtractor({ cache: { enabled: false } });
    const result = await extractor.extract('test-package', {
      formats: ['llms'],
    });

    expect(result.outputs).toBeDefined();
  });

  it('should respect llmsTokenLimit option', async () => {
    const extractor = createExtractor({ cache: { enabled: false } });
    const result = await extractor.extract('test-package', {
      formats: ['llms'],
      llmsTokenLimit: 1000,
    });

    expect(result).toBeDefined();
  });

  it('should use cache when available', async () => {
    // Use a unique cache directory for this test
    const cacheDir = `.test-cache-${Date.now()}`;
    const extractor = createExtractor({ cache: { enabled: true, ttl: 60000, dir: cacheDir } });

    try {
      // First extraction - should not be from cache
      const result1 = await extractor.extract('test-package');
      expect(result1.fromCache).toBe(false);

      // Second extraction - should be from cache
      const result2 = await extractor.extract('test-package');
      expect(result2.fromCache).toBe(true);
    } finally {
      // Clean up
      await extractor.clearCache();
    }
  });

  it('should ignore cache when ignoreCache is true', async () => {
    const extractor = createExtractor({ cache: { enabled: true, ttl: 60000 } });

    // First extraction
    await extractor.extract('test-package');

    // Second extraction with ignoreCache
    const result = await extractor.extract('test-package', { ignoreCache: true });
    expect(result.fromCache).toBe(false);

    // Clean up
    await extractor.clearCache();
  });
});

describe('extractor.use', () => {
  it('should register a plugin', () => {
    const extractor = createExtractor();
    const plugin: Plugin = {
      name: 'test-plugin',
      version: '1.0.0',
      category: 'utility',
      install: vi.fn(),
    };

    const returnedExtractor = extractor.use(plugin);

    expect(returnedExtractor).toBe(extractor);
    expect(plugin.install).toHaveBeenCalled();
    expect(extractor.listPlugins().some(p => p.name === 'test-plugin')).toBe(true);
  });

  it('should allow chaining', () => {
    const extractor = createExtractor();
    const plugin1: Plugin = {
      name: 'plugin-1',
      version: '1.0.0',
      category: 'utility',
      install: vi.fn(),
    };
    const plugin2: Plugin = {
      name: 'plugin-2',
      version: '1.0.0',
      category: 'utility',
      install: vi.fn(),
    };

    extractor.use(plugin1).use(plugin2);

    const plugins = extractor.listPlugins();
    expect(plugins.some(p => p.name === 'plugin-1')).toBe(true);
    expect(plugins.some(p => p.name === 'plugin-2')).toBe(true);
  });
});

describe('extractor.unregister', () => {
  it('should unregister a plugin', () => {
    const extractor = createExtractor();
    const plugin: Plugin = {
      name: 'removable-plugin',
      version: '1.0.0',
      category: 'utility',
      install: vi.fn(),
    };

    extractor.use(plugin);
    expect(extractor.listPlugins().some(p => p.name === 'removable-plugin')).toBe(true);

    const result = extractor.unregister('removable-plugin');
    expect(result).toBe(true);
    expect(extractor.listPlugins().some(p => p.name === 'removable-plugin')).toBe(false);
  });

  it('should return false for non-existent plugin', () => {
    const extractor = createExtractor();
    const result = extractor.unregister('non-existent');
    expect(result).toBe(false);
  });
});

describe('extractor.listPlugins', () => {
  it('should return plugin info array', () => {
    const extractor = createExtractor();
    const plugins = extractor.listPlugins();

    expect(Array.isArray(plugins)).toBe(true);
    plugins.forEach(plugin => {
      expect(plugin).toHaveProperty('name');
      expect(plugin).toHaveProperty('version');
      expect(plugin).toHaveProperty('category');
    });
  });
});

describe('extractor.clearCache', () => {
  it('should clear the cache', async () => {
    const extractor = createExtractor({ cache: { enabled: true } });

    // Add something to cache
    await extractor.extract('test-package');

    // Clear cache
    await extractor.clearCache();

    // Verify cache is empty (next extract should not be from cache)
    const result = await extractor.extract('test-package');
    expect(result.fromCache).toBe(false);
  });

  it('should not throw when cache is disabled', async () => {
    const extractor = createExtractor({ cache: { enabled: false } });
    await expect(extractor.clearCache()).resolves.not.toThrow();
  });
});

describe('extractor.getCacheStats', () => {
  it('should return cache stats', async () => {
    const extractor = createExtractor({ cache: { enabled: true } });
    const stats = await extractor.getCacheStats();

    expect(stats).toHaveProperty('entries');
    expect(stats).toHaveProperty('size');
    expect(stats).toHaveProperty('dir');
  });

  it('should return empty stats when cache is disabled', async () => {
    const extractor = createExtractor({ cache: { enabled: false } });
    const stats = await extractor.getCacheStats();

    expect(stats.entries).toBe(0);
    expect(stats.size).toBe(0);
    expect(stats.dir).toBe('');
  });
});

describe('extractor.fetch', () => {
  it('should fetch package info without extracting', async () => {
    const extractor = createExtractor();
    const pkg = await extractor.fetch('test-package');

    expect(pkg).toBeDefined();
    expect(pkg.name).toBe('test-package');
    expect(pkg.version).toBe('1.0.0');
  });
});

describe('extract (quick function)', () => {
  it('should extract documentation using default extractor', async () => {
    const result = await extract('test-package');

    expect(result).toBeDefined();
    expect(result.package.name).toBe('test-package');
  });

  it('should accept options', async () => {
    const result = await extract('test-package', {
      formats: ['llms'],
      llmsTokenLimit: 500,
    });

    expect(result).toBeDefined();
  });
});
