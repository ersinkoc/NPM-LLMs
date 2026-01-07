/**
 * Tests for cache.ts error handling paths
 * Uses mocking to test error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the fs utilities
vi.mock('../../../src/utils/fs.js', async () => {
  const actual = await vi.importActual('../../../src/utils/fs.js');
  return {
    ...actual,
    listFiles: vi.fn(),
    exists: vi.fn(),
    getDirSize: vi.fn(),
    deleteDir: vi.fn(),
    ensureDir: vi.fn(),
    readJsonFile: vi.fn(),
    deleteFile: vi.fn(),
    writeJsonFile: vi.fn(),
  };
});

import { listFiles, exists, getDirSize, deleteDir, ensureDir, readJsonFile, deleteFile, writeJsonFile } from '../../../src/utils/fs.js';
import { FileCache, CacheError } from '../../../src/core/cache.js';

describe('cache error handling', () => {
  const mockedListFiles = vi.mocked(listFiles);
  const mockedExists = vi.mocked(exists);
  const mockedGetDirSize = vi.mocked(getDirSize);
  const mockedDeleteDir = vi.mocked(deleteDir);
  const mockedEnsureDir = vi.mocked(ensureDir);
  const mockedReadJsonFile = vi.mocked(readJsonFile);
  const mockedDeleteFile = vi.mocked(deleteFile);
  const mockedWriteJsonFile = vi.mocked(writeJsonFile);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('prune error handling', () => {
    it('should return 0 when listFiles throws during prune', async () => {
      // This tests line 236 in cache.ts - the catch block in prune()
      const cache = new FileCache('/test/cache/dir');
      mockedListFiles.mockRejectedValue(new Error('Permission denied'));

      const removed = await cache.prune();

      expect(removed).toBe(0);
    });

    it('should handle EACCES error during prune gracefully', async () => {
      const cache = new FileCache('/test/cache/dir');
      const accessError = new Error('Access denied') as NodeJS.ErrnoException;
      accessError.code = 'EACCES';
      mockedListFiles.mockRejectedValue(accessError);

      const removed = await cache.prune();

      expect(removed).toBe(0);
    });
  });

  describe('getStats error handling', () => {
    it('should return empty stats when exists throws', async () => {
      // This tests lines 261-262 in cache.ts - the catch block in getStats()
      const cache = new FileCache('/test/cache/dir');
      mockedExists.mockRejectedValue(new Error('IO error'));

      const stats = await cache.getStats();

      expect(stats).toEqual({ entries: 0, size: 0, dir: '/test/cache/dir' });
    });

    it('should return empty stats when listFiles throws in getStats', async () => {
      const cache = new FileCache('/test/cache/dir');
      mockedExists.mockResolvedValue(true);
      mockedListFiles.mockRejectedValue(new Error('Permission denied'));

      const stats = await cache.getStats();

      expect(stats).toEqual({ entries: 0, size: 0, dir: '/test/cache/dir' });
    });

    it('should return empty stats when getDirSize throws', async () => {
      const cache = new FileCache('/test/cache/dir');
      mockedExists.mockResolvedValue(true);
      mockedListFiles.mockResolvedValue(['file1.json', 'file2.json']);
      mockedGetDirSize.mockRejectedValue(new Error('Cannot read directory'));

      const stats = await cache.getStats();

      expect(stats).toEqual({ entries: 0, size: 0, dir: '/test/cache/dir' });
    });

    it('should handle EPERM error in getStats gracefully', async () => {
      const cache = new FileCache('/test/cache/dir');
      const permError = new Error('Operation not permitted') as NodeJS.ErrnoException;
      permError.code = 'EPERM';
      mockedExists.mockRejectedValue(permError);

      const stats = await cache.getStats();

      expect(stats).toEqual({ entries: 0, size: 0, dir: '/test/cache/dir' });
    });
  });

  describe('clear error handling', () => {
    it('should throw CacheError when deleteDir fails in clear', async () => {
      // Tests lines 198-200 in cache.ts - clear() error handling
      const cache = new FileCache('/test/cache/dir');
      mockedDeleteDir.mockRejectedValue(new Error('Permission denied'));

      await expect(cache.clear()).rejects.toThrow(CacheError);
      await expect(cache.clear()).rejects.toThrow('Failed to clear cache');
    });

    it('should throw CacheError when ensureDir fails in clear', async () => {
      const cache = new FileCache('/test/cache/dir');
      mockedDeleteDir.mockResolvedValue(true);
      mockedEnsureDir.mockRejectedValue(new Error('Cannot create directory'));

      await expect(cache.clear()).rejects.toThrow(CacheError);
    });

    it('should handle non-Error objects in clear error', async () => {
      const cache = new FileCache('/test/cache/dir');
      mockedDeleteDir.mockRejectedValue('string error');

      await expect(cache.clear()).rejects.toThrow(CacheError);
      await expect(cache.clear()).rejects.toThrow('string error');
    });
  });

  describe('set error handling', () => {
    it('should throw CacheError when writeJsonFile fails', async () => {
      // Tests lines 165-167 in cache.ts - set() error handling
      const cache = new FileCache('/test/cache/dir');
      mockedWriteJsonFile.mockRejectedValue(new Error('Disk full'));

      await expect(cache.set('key', { data: 'test' })).rejects.toThrow(CacheError);
      await expect(cache.set('key', { data: 'test' })).rejects.toThrow('Failed to write cache');
    });

    it('should handle non-Error objects in set error', async () => {
      const cache = new FileCache('/test/cache/dir');
      mockedWriteJsonFile.mockRejectedValue('string error');

      await expect(cache.set('key', { data: 'test' })).rejects.toThrow(CacheError);
      await expect(cache.set('key', { data: 'test' })).rejects.toThrow('string error');
    });
  });

  describe('get error handling with delete failure', () => {
    it('should return null when readJsonFile throws and delete also fails', async () => {
      // Tests line 140 in cache.ts - nested catch block in get()
      const cache = new FileCache('/test/cache/dir');
      mockedReadJsonFile.mockRejectedValue(new Error('Corrupted JSON'));
      mockedDeleteFile.mockRejectedValue(new Error('Cannot delete'));

      const result = await cache.get('key');

      expect(result).toBeNull();
    });
  });

  describe('prune corrupted entry handling', () => {
    it('should delete corrupted entries when readJsonFile throws', async () => {
      // Tests lines 230-232 in cache.ts - corrupted entry handling
      const cache = new FileCache('/test/cache/dir');
      mockedListFiles.mockResolvedValue(['corrupted.json']);
      mockedReadJsonFile.mockRejectedValue(new Error('JSON parse error'));
      mockedDeleteFile.mockResolvedValue(true);

      const removed = await cache.prune();

      expect(removed).toBe(1);
      expect(mockedDeleteFile).toHaveBeenCalledWith(expect.stringContaining('corrupted.json'));
    });

    it('should count corrupted entries as removed', async () => {
      const cache = new FileCache('/test/cache/dir');
      mockedListFiles.mockResolvedValue(['good.json', 'bad1.json', 'bad2.json']);
      mockedReadJsonFile
        .mockResolvedValueOnce({ version: 1, timestamp: Date.now(), ttl: 999999999, data: {} }) // Valid entry, not expired
        .mockRejectedValueOnce(new Error('Corrupted'))
        .mockRejectedValueOnce(new Error('Also corrupted'));
      mockedDeleteFile.mockResolvedValue(true);

      const removed = await cache.prune();

      expect(removed).toBe(2); // Two corrupted entries removed
    });
  });
});
