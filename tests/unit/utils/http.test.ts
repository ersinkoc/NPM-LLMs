/**
 * Tests for src/utils/http.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  DEFAULT_REGISTRY,
  DEFAULT_TIMEOUT,
  fetchJson,
  fetchBinary,
  fetchGzipped,
  encodePackageName,
  buildPackageUrl,
  validateStatus,
} from '../../../src/utils/http.js';
import { DownloadError, TimeoutError } from '../../../src/errors.js';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('constants', () => {
  it('should export DEFAULT_REGISTRY', () => {
    expect(DEFAULT_REGISTRY).toBe('https://registry.npmjs.org');
  });

  it('should export DEFAULT_TIMEOUT', () => {
    expect(DEFAULT_TIMEOUT).toBe(30000);
  });
});

describe('encodePackageName', () => {
  it('should encode regular package names', () => {
    expect(encodePackageName('lodash')).toBe('lodash');
    expect(encodePackageName('my-package')).toBe('my-package');
  });

  it('should encode scoped packages correctly', () => {
    expect(encodePackageName('@babel/core')).toBe('@babel%2Fcore');
    expect(encodePackageName('@types/node')).toBe('@types%2Fnode');
    expect(encodePackageName('@scope/my-package')).toBe('@scope%2Fmy-package');
  });

  it('should handle scoped packages without slash', () => {
    // Edge case: @ without slash should be fully encoded
    expect(encodePackageName('@invalid')).toBe('%40invalid');
  });

  it('should encode special characters', () => {
    // Special characters should be encoded
    expect(encodePackageName('package name')).toBe('package%20name');
  });
});

describe('buildPackageUrl', () => {
  it('should build URL without version', () => {
    const url = buildPackageUrl('lodash');
    expect(url).toBe('https://registry.npmjs.org/lodash');
  });

  it('should build URL with version', () => {
    const url = buildPackageUrl('lodash', '4.17.21');
    expect(url).toBe('https://registry.npmjs.org/lodash/4.17.21');
  });

  it('should build URL for scoped packages', () => {
    const url = buildPackageUrl('@babel/core');
    expect(url).toBe('https://registry.npmjs.org/@babel%2Fcore');
  });

  it('should build URL for scoped packages with version', () => {
    const url = buildPackageUrl('@babel/core', '7.22.0');
    expect(url).toBe('https://registry.npmjs.org/@babel%2Fcore/7.22.0');
  });

  it('should use custom registry', () => {
    const url = buildPackageUrl('lodash', undefined, 'https://custom.registry.com');
    expect(url).toBe('https://custom.registry.com/lodash');
  });
});

describe('validateStatus', () => {
  it('should not throw for 200 status', () => {
    expect(() => validateStatus(200, 'https://example.com')).not.toThrow();
  });

  it('should not throw for 201 status', () => {
    expect(() => validateStatus(201, 'https://example.com')).not.toThrow();
  });

  it('should not throw for 299 status', () => {
    expect(() => validateStatus(299, 'https://example.com')).not.toThrow();
  });

  it('should throw for 300 status', () => {
    expect(() => validateStatus(300, 'https://example.com')).toThrow(DownloadError);
  });

  it('should throw for 404 status', () => {
    expect(() => validateStatus(404, 'https://example.com')).toThrow(DownloadError);
  });

  it('should throw for 500 status', () => {
    expect(() => validateStatus(500, 'https://example.com')).toThrow(DownloadError);
  });

  it('should throw for 199 status', () => {
    expect(() => validateStatus(199, 'https://example.com')).toThrow(DownloadError);
  });
});

describe('fetchJson', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and parse JSON', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ name: 'test' }),
    });

    const result = await fetchJson<{ name: string }>('https://example.com/api');

    expect(result.data).toEqual({ name: 'test' });
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/json' }),
      })
    );
  });

  it('should include custom headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({}),
    });

    await fetchJson('https://example.com/api', {
      headers: { Authorization: 'Bearer token' },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          Authorization: 'Bearer token',
        }),
      })
    );
  });

  it('should throw DownloadError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    await expect(fetchJson('https://example.com/api')).rejects.toThrow(DownloadError);
  });

  it('should throw TimeoutError on timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(fetchJson('https://example.com/api', { timeout: 100 })).rejects.toThrow(TimeoutError);
  });

  it('should throw DownloadError on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchJson('https://example.com/api')).rejects.toThrow(DownloadError);
  });

  it('should throw DownloadError on unknown error', async () => {
    mockFetch.mockRejectedValueOnce('some string error');

    await expect(fetchJson('https://example.com/api')).rejects.toThrow(DownloadError);
  });

  it('should re-throw DownloadError as-is', async () => {
    const error = new DownloadError('Custom error', 'https://example.com');
    mockFetch.mockRejectedValueOnce(error);

    await expect(fetchJson('https://example.com/api')).rejects.toBe(error);
  });
});

describe('fetchBinary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch binary data', async () => {
    const mockData = new ArrayBuffer(8);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => mockData,
    });

    const result = await fetchBinary('https://example.com/file.bin');

    expect(result.data).toBe(mockData);
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/file.bin',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ Accept: 'application/octet-stream' }),
      })
    );
  });

  it('should throw DownloadError on non-OK response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchBinary('https://example.com/file.bin')).rejects.toThrow(DownloadError);
  });

  it('should throw TimeoutError on timeout', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    await expect(fetchBinary('https://example.com/file.bin', { timeout: 100 })).rejects.toThrow(TimeoutError);
  });

  it('should throw DownloadError on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(fetchBinary('https://example.com/file.bin')).rejects.toThrow(DownloadError);
  });

  it('should throw DownloadError on unknown error', async () => {
    mockFetch.mockRejectedValueOnce(null);

    await expect(fetchBinary('https://example.com/file.bin')).rejects.toThrow(DownloadError);
  });

  it('should re-throw DownloadError as-is', async () => {
    const error = new DownloadError('Custom error', 'https://example.com');
    mockFetch.mockRejectedValueOnce(error);

    await expect(fetchBinary('https://example.com/file.bin')).rejects.toBe(error);
  });
});

describe('fetchGzipped', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and decompress gzipped data', async () => {
    // Create valid gzip data using zlib
    const { gzipSync } = await import('node:zlib');
    const original = Buffer.from('Hello, World!');
    const gzipped = gzipSync(original);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => gzipped.buffer.slice(gzipped.byteOffset, gzipped.byteOffset + gzipped.byteLength),
    });

    const result = await fetchGzipped('https://example.com/file.gz');

    expect(result.toString()).toBe('Hello, World!');
  });

  it('should throw DownloadError on invalid gzip data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      arrayBuffer: async () => new ArrayBuffer(8), // Invalid gzip data
    });

    await expect(fetchGzipped('https://example.com/file.gz')).rejects.toThrow(DownloadError);
  });

  it('should propagate fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(fetchGzipped('https://example.com/file.gz')).rejects.toThrow(DownloadError);
  });
});
