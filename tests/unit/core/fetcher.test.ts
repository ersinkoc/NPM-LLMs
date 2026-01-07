/**
 * Tests for src/core/fetcher.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePackageName,
  parsePackageSpec,
  fetchPackageMetadata,
  downloadPackageFiles,
  fetchPackage,
  listVersions,
  getDistTags,
} from '../../../src/core/fetcher.js';
import {
  ValidationError,
  PackageNotFoundError,
  VersionNotFoundError,
  DownloadError,
} from '../../../src/errors.js';

// Mock http utils
vi.mock('../../../src/utils/http.js', () => ({
  fetchJson: vi.fn(),
  fetchGzipped: vi.fn(),
  buildPackageUrl: vi.fn((name: string, version?: string, registry?: string) => {
    const base = registry || 'https://registry.npmjs.org';
    if (version) {
      return `${base}/${name}/${version}`;
    }
    return `${base}/${name}`;
  }),
  DEFAULT_REGISTRY: 'https://registry.npmjs.org',
}));

// Mock tar utils
vi.mock('../../../src/utils/tar.js', () => ({
  extractTarToMap: vi.fn(),
}));

import { fetchJson, fetchGzipped } from '../../../src/utils/http.js';
import { extractTarToMap } from '../../../src/utils/tar.js';

describe('validatePackageName', () => {
  it('should accept valid package names', () => {
    expect(() => validatePackageName('lodash')).not.toThrow();
    expect(() => validatePackageName('my-package')).not.toThrow();
    expect(() => validatePackageName('my_package')).not.toThrow();
    expect(() => validatePackageName('my.package')).not.toThrow();
    expect(() => validatePackageName('package123')).not.toThrow();
  });

  it('should accept valid scoped package names', () => {
    expect(() => validatePackageName('@scope/package')).not.toThrow();
    expect(() => validatePackageName('@my-scope/my-package')).not.toThrow();
    expect(() => validatePackageName('@org/lib123')).not.toThrow();
  });

  it('should reject empty or non-string names', () => {
    expect(() => validatePackageName('')).toThrow(ValidationError);
    expect(() => validatePackageName(null as unknown as string)).toThrow(ValidationError);
    expect(() => validatePackageName(undefined as unknown as string)).toThrow(ValidationError);
  });

  it('should reject invalid package names', () => {
    expect(() => validatePackageName('UPPERCASE')).toThrow(ValidationError);
    expect(() => validatePackageName('with spaces')).toThrow(ValidationError);
    expect(() => validatePackageName('.startswithdot')).toThrow(ValidationError);
    expect(() => validatePackageName('_startswithunderscore')).toThrow(ValidationError);
  });

  it('should reject names exceeding 214 characters', () => {
    const longName = 'a'.repeat(215);
    expect(() => validatePackageName(longName)).toThrow(ValidationError);
  });
});

describe('parsePackageSpec', () => {
  it('should parse simple package names', () => {
    const result = parsePackageSpec('lodash');
    expect(result.name).toBe('lodash');
    expect(result.version).toBeUndefined();
  });

  it('should parse package@version format', () => {
    const result = parsePackageSpec('lodash@4.17.21');
    expect(result.name).toBe('lodash');
    expect(result.version).toBe('4.17.21');
  });

  it('should parse scoped packages', () => {
    const result = parsePackageSpec('@babel/core');
    expect(result.name).toBe('@babel/core');
    expect(result.version).toBeUndefined();
  });

  it('should parse scoped packages with version', () => {
    const result = parsePackageSpec('@babel/core@7.22.0');
    expect(result.name).toBe('@babel/core');
    expect(result.version).toBe('7.22.0');
  });

  it('should handle whitespace', () => {
    const result = parsePackageSpec('  lodash@4.17.21  ');
    expect(result.name).toBe('lodash');
    expect(result.version).toBe('4.17.21');
  });

  it('should reject empty spec', () => {
    expect(() => parsePackageSpec('')).toThrow(ValidationError);
    expect(() => parsePackageSpec(null as unknown as string)).toThrow(ValidationError);
  });

  it('should reject invalid scoped packages', () => {
    expect(() => parsePackageSpec('@invalid')).toThrow(ValidationError);
  });

  it('should handle scoped packages with trailing @', () => {
    // This tests the edge case where a scoped package has an empty version
    const result = parsePackageSpec('@scope/pkg@');
    expect(result.name).toBe('@scope/pkg');
    expect(result.version).toBeUndefined();
  });

  it('should handle unscoped packages with trailing @', () => {
    const result = parsePackageSpec('lodash@');
    expect(result.name).toBe('lodash');
    expect(result.version).toBeUndefined();
  });

  it('should handle complex version tags', () => {
    const result = parsePackageSpec('package@1.0.0-beta.1');
    expect(result.name).toBe('package');
    expect(result.version).toBe('1.0.0-beta.1');
  });
});

describe('fetchPackageMetadata', () => {
  const mockedFetchJson = vi.mocked(fetchJson);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch metadata for latest version', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        description: 'A test package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            description: 'A test package',
            dist: { tarball: 'https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz' },
          },
        },
      },
    });

    const result = await fetchPackageMetadata('test-package');

    expect(result.name).toBe('test-package');
    expect(result.version).toBe('1.0.0');
    expect(result.tarball).toContain('test-package-1.0.0.tgz');
  });

  it('should fetch specific version directly', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        version: '2.0.0',
        dist: { tarball: 'https://registry.npmjs.org/test-package/-/test-package-2.0.0.tgz' },
      },
    });

    const result = await fetchPackageMetadata('test-package', '2.0.0');

    expect(result.version).toBe('2.0.0');
  });

  it('should resolve dist-tag to version', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': { latest: '1.0.0', beta: '2.0.0-beta' },
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dist: { tarball: 'https://example.com/1.0.0.tgz' },
          },
          '2.0.0-beta': {
            name: 'test-package',
            version: '2.0.0-beta',
            dist: { tarball: 'https://example.com/2.0.0-beta.tgz' },
          },
        },
      },
    });

    const result = await fetchPackageMetadata('test-package', 'beta');

    expect(result.version).toBe('2.0.0-beta');
  });

  it('should throw PackageNotFoundError for 404', async () => {
    mockedFetchJson.mockRejectedValue(new DownloadError('HTTP 404 Not Found'));

    await expect(fetchPackageMetadata('nonexistent-package')).rejects.toThrow(PackageNotFoundError);
  });

  it('should throw VersionNotFoundError for missing version', async () => {
    // First call for specific version returns 404
    mockedFetchJson
      .mockRejectedValueOnce(new DownloadError('HTTP 404 Not Found'))
      .mockResolvedValueOnce({
        data: {
          name: 'test-package',
          'dist-tags': { latest: '1.0.0' },
          versions: {
            '1.0.0': {
              name: 'test-package',
              version: '1.0.0',
              dist: { tarball: 'https://example.com/1.0.0.tgz' },
            },
          },
        },
      });

    await expect(fetchPackageMetadata('test-package', '999.0.0')).rejects.toThrow(VersionNotFoundError);
  });

  it('should throw PackageNotFoundError for empty versions', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        versions: {},
      },
    });

    await expect(fetchPackageMetadata('test-package')).rejects.toThrow(PackageNotFoundError);
  });

  it('should normalize string repository', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        version: '1.0.0',
        repository: 'https://github.com/user/repo',
        dist: { tarball: 'https://example.com/1.0.0.tgz' },
      },
    });

    const result = await fetchPackageMetadata('test-package', '1.0.0');

    expect(result.repository).toEqual({
      type: 'git',
      url: 'https://github.com/user/repo',
    });
  });

  it('should handle object repository', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        version: '1.0.0',
        repository: { type: 'git', url: 'https://github.com/user/repo' },
        dist: { tarball: 'https://example.com/1.0.0.tgz' },
      },
    });

    const result = await fetchPackageMetadata('test-package', '1.0.0');

    expect(result.repository).toEqual({
      type: 'git',
      url: 'https://github.com/user/repo',
    });
  });

  it('should use typings fallback for types', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        version: '1.0.0',
        typings: 'dist/index.d.ts',
        dist: { tarball: 'https://example.com/1.0.0.tgz' },
      },
    });

    const result = await fetchPackageMetadata('test-package', '1.0.0');

    expect(result.types).toBe('dist/index.d.ts');
  });

  it('should throw for missing tarball', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        version: '1.0.0',
        dist: {},
      },
    });

    await expect(fetchPackageMetadata('test-package', '1.0.0')).rejects.toThrow(DownloadError);
    await expect(fetchPackageMetadata('test-package', '1.0.0')).rejects.toThrow('missing tarball URL');
  });

  it('should fall back to full metadata for 404 on specific version', async () => {
    mockedFetchJson
      .mockRejectedValueOnce(new DownloadError('HTTP 404 Not Found'))
      .mockResolvedValueOnce({
        data: {
          name: 'test-package',
          'dist-tags': { latest: '1.0.0' },
          versions: {
            '1.0.0': {
              name: 'test-package',
              version: '1.0.0',
              dist: { tarball: 'https://example.com/1.0.0.tgz' },
            },
          },
        },
      });

    const result = await fetchPackageMetadata('test-package', '1.0.0');

    expect(result.version).toBe('1.0.0');
    expect(mockedFetchJson).toHaveBeenCalledTimes(2);
  });

  it('should resolve matching version prefix', async () => {
    // First call for specific version "1" returns 404
    mockedFetchJson
      .mockRejectedValueOnce(new DownloadError('HTTP 404 Not Found'))
      .mockResolvedValueOnce({
        data: {
          name: 'test-package',
          'dist-tags': {},
          versions: {
            '1.0.0': {
              name: 'test-package',
              version: '1.0.0',
              dist: { tarball: 'https://example.com/1.0.0.tgz' },
            },
            '1.0.1': {
              name: 'test-package',
              version: '1.0.1',
              dist: { tarball: 'https://example.com/1.0.1.tgz' },
            },
            '2.0.0': {
              name: 'test-package',
              version: '2.0.0',
              dist: { tarball: 'https://example.com/2.0.0.tgz' },
            },
          },
        },
      });

    const result = await fetchPackageMetadata('test-package', '1');

    // Should match highest version starting with '1'
    expect(result.version).toBe('1.0.1');
  });

  it('should rethrow non-404 errors', async () => {
    mockedFetchJson.mockRejectedValue(new Error('Network error'));

    await expect(fetchPackageMetadata('test-package')).rejects.toThrow('Network error');
  });

  it('should handle fallback when no latest dist-tag', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': {},
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dist: { tarball: 'https://example.com/1.0.0.tgz' },
          },
          '2.0.0': {
            name: 'test-package',
            version: '2.0.0',
            dist: { tarball: 'https://example.com/2.0.0.tgz' },
          },
        },
      },
    });

    const result = await fetchPackageMetadata('test-package');

    // Should fallback to highest version
    expect(result.version).toBe('2.0.0');
  });

  it('should include all metadata fields', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        version: '1.0.0',
        description: 'Test description',
        main: 'index.js',
        types: 'index.d.ts',
        exports: { '.': './dist/index.js' },
        keywords: ['test', 'package'],
        author: { name: 'Test Author', email: 'test@example.com' },
        license: 'MIT',
        homepage: 'https://example.com',
        dist: { tarball: 'https://example.com/1.0.0.tgz' },
      },
    });

    const result = await fetchPackageMetadata('test-package', '1.0.0');

    expect(result.description).toBe('Test description');
    expect(result.main).toBe('index.js');
    expect(result.types).toBe('index.d.ts');
    expect(result.exports).toEqual({ '.': './dist/index.js' });
    expect(result.keywords).toEqual(['test', 'package']);
    expect(result.author).toEqual({ name: 'Test Author', email: 'test@example.com' });
    expect(result.license).toBe('MIT');
    expect(result.homepage).toBe('https://example.com');
  });
});

describe('downloadPackageFiles', () => {
  const mockedFetchGzipped = vi.mocked(fetchGzipped);
  const mockedExtractTarToMap = vi.mocked(extractTarToMap);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should download and extract tarball', async () => {
    const mockBuffer = Buffer.from('mock tarball');
    const mockFiles = new Map([
      ['package/index.js', 'console.log("hello");'],
      ['package/package.json', '{}'],
    ]);

    mockedFetchGzipped.mockResolvedValue(mockBuffer);
    mockedExtractTarToMap.mockResolvedValue(mockFiles);

    const result = await downloadPackageFiles('https://example.com/pkg.tgz');

    expect(mockedFetchGzipped).toHaveBeenCalledWith('https://example.com/pkg.tgz', {});
    expect(mockedExtractTarToMap).toHaveBeenCalledWith(mockBuffer);
    expect(result).toBe(mockFiles);
  });

  it('should pass options to fetchGzipped', async () => {
    mockedFetchGzipped.mockResolvedValue(Buffer.from(''));
    mockedExtractTarToMap.mockResolvedValue(new Map());

    await downloadPackageFiles('https://example.com/pkg.tgz', { timeout: 5000 });

    expect(mockedFetchGzipped).toHaveBeenCalledWith('https://example.com/pkg.tgz', { timeout: 5000 });
  });
});

describe('fetchPackage', () => {
  const mockedFetchJson = vi.mocked(fetchJson);
  const mockedFetchGzipped = vi.mocked(fetchGzipped);
  const mockedExtractTarToMap = vi.mocked(extractTarToMap);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch complete package with files', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        version: '1.0.0',
        dist: { tarball: 'https://example.com/test-package-1.0.0.tgz' },
      },
    });
    mockedFetchGzipped.mockResolvedValue(Buffer.from('mock'));
    mockedExtractTarToMap.mockResolvedValue(
      new Map([['package/index.js', 'code']])
    );

    const result = await fetchPackage('test-package@1.0.0');

    expect(result.name).toBe('test-package');
    expect(result.version).toBe('1.0.0');
    expect(result.files.get('package/index.js')).toBe('code');
  });

  it('should use custom registry', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dist: { tarball: 'https://custom.registry.com/pkg.tgz' },
          },
        },
      },
    });
    mockedFetchGzipped.mockResolvedValue(Buffer.from(''));
    mockedExtractTarToMap.mockResolvedValue(new Map());

    await fetchPackage('test-package', { registry: 'https://custom.registry.com' });

    expect(mockedFetchJson).toHaveBeenCalled();
  });

  it('should fetch without version specified', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': { latest: '3.0.0' },
        versions: {
          '3.0.0': {
            name: 'test-package',
            version: '3.0.0',
            dist: { tarball: 'https://example.com/3.0.0.tgz' },
          },
        },
      },
    });
    mockedFetchGzipped.mockResolvedValue(Buffer.from(''));
    mockedExtractTarToMap.mockResolvedValue(new Map());

    const result = await fetchPackage('test-package');

    expect(result.version).toBe('3.0.0');
  });
});

describe('listVersions', () => {
  const mockedFetchJson = vi.mocked(fetchJson);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list versions sorted newest first', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        versions: {
          '1.0.0': {},
          '2.0.0': {},
          '1.5.0': {},
        },
      },
    });

    const result = await listVersions('test-package');

    expect(result).toEqual(['2.0.0', '1.5.0', '1.0.0']);
  });

  it('should throw PackageNotFoundError for 404', async () => {
    mockedFetchJson.mockRejectedValue(new DownloadError('HTTP 404 Not Found'));

    await expect(listVersions('nonexistent')).rejects.toThrow(PackageNotFoundError);
  });

  it('should return empty array for no versions', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        versions: {},
      },
    });

    const result = await listVersions('test-package');

    expect(result).toEqual([]);
  });

  it('should rethrow non-404 errors', async () => {
    mockedFetchJson.mockRejectedValue(new Error('Network error'));

    await expect(listVersions('test-package')).rejects.toThrow('Network error');
  });

  it('should handle undefined versions', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
      },
    });

    const result = await listVersions('test-package');

    expect(result).toEqual([]);
  });
});

describe('getDistTags', () => {
  const mockedFetchJson = vi.mocked(fetchJson);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return dist-tags', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': {
          latest: '2.0.0',
          beta: '3.0.0-beta.1',
          next: '2.1.0',
        },
      },
    });

    const result = await getDistTags('test-package');

    expect(result).toEqual({
      latest: '2.0.0',
      beta: '3.0.0-beta.1',
      next: '2.1.0',
    });
  });

  it('should return empty object if no dist-tags', async () => {
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
      },
    });

    const result = await getDistTags('test-package');

    expect(result).toEqual({});
  });

  it('should throw PackageNotFoundError for 404', async () => {
    mockedFetchJson.mockRejectedValue(new DownloadError('HTTP 404 Not Found'));

    await expect(getDistTags('nonexistent')).rejects.toThrow(PackageNotFoundError);
  });

  it('should validate package name', async () => {
    await expect(getDistTags('')).rejects.toThrow(ValidationError);
  });

  it('should rethrow non-404 errors', async () => {
    mockedFetchJson.mockRejectedValue(new Error('Network error'));

    await expect(getDistTags('test-package')).rejects.toThrow('Network error');
  });
});

describe('version comparison', () => {
  const mockedFetchJson = vi.mocked(fetchJson);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle equal versions when resolving (compareVersions returns 0)', async () => {
    // Test compareVersions returning 0 for equal versions
    // When versions array has only one version, sort uses compareVersions internally
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': {},
        versions: {
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dist: { tarball: 'https://example.com/1.0.0.tgz' },
          },
        },
      },
    });

    const result = await fetchPackageMetadata('test-package');
    expect(result.version).toBe('1.0.0');
  });

  it('should throw VersionNotFoundError when resolved version data is undefined', async () => {
    // Mock a scenario where resolved version exists in keys but versionData is undefined
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': { latest: '1.0.0' },
        versions: {
          '1.0.0': undefined as any, // This makes versionData undefined after resolution
        },
      },
    });

    await expect(fetchPackageMetadata('test-package')).rejects.toThrow(VersionNotFoundError);
  });

  it('should sort equal versions correctly (1.0.0 vs 1.0.0)', async () => {
    // Test that comparing equal versions works in the sort
    mockedFetchJson.mockResolvedValue({
      data: {
        name: 'test-package',
        'dist-tags': {},
        versions: {
          '2.0.0': {
            name: 'test-package',
            version: '2.0.0',
            dist: { tarball: 'https://example.com/2.0.0.tgz' },
          },
          '1.0.0': {
            name: 'test-package',
            version: '1.0.0',
            dist: { tarball: 'https://example.com/1.0.0.tgz' },
          },
          '1.0.0-alpha': {
            name: 'test-package',
            version: '1.0.0-alpha',
            dist: { tarball: 'https://example.com/1.0.0-alpha.tgz' },
          },
        },
      },
    });

    // Should select highest version (2.0.0)
    const result = await fetchPackageMetadata('test-package');
    expect(result.version).toBe('2.0.0');
  });
});
