/**
 * Cache tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileCache, createCache } from '../../../src/core/cache.js';

const TEST_CACHE_DIR = join(tmpdir(), 'npm-llms-test-cache');

describe('cache', () => {
  beforeEach(async () => {
    await mkdir(TEST_CACHE_DIR, { recursive: true });
  });

  afterEach(async () => {
    await rm(TEST_CACHE_DIR, { recursive: true, force: true });
  });

  describe('FileCache', () => {
    it('should create cache instance', () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      expect(cache).toBeDefined();
    });

    it('should store and retrieve values', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      const key = 'test-key';
      const value = { foo: 'bar', num: 42 };

      await cache.set(key, value);
      const retrieved = await cache.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return null for missing keys', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should check existence with has', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      const key = 'test-key';

      expect(await cache.has(key)).toBe(false);
      await cache.set(key, { data: 'test' });
      expect(await cache.has(key)).toBe(true);
    });

    it('should delete entries', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      const key = 'test-key';

      await cache.set(key, { data: 'test' });
      expect(await cache.has(key)).toBe(true);

      await cache.delete(key);
      expect(await cache.has(key)).toBe(false);
    });

    it('should clear all entries', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);

      await cache.set('key1', { a: 1 });
      await cache.set('key2', { b: 2 });

      await cache.clear();

      expect(await cache.has('key1')).toBe(false);
      expect(await cache.has('key2')).toBe(false);
    });

    it('should respect TTL', async () => {
      // 100ms TTL
      const cache = new FileCache(TEST_CACHE_DIR, 100);

      await cache.set('short-lived', { data: 'test' });

      // Should exist immediately
      expect(await cache.get('short-lived')).not.toBeNull();

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired
      expect(await cache.get('short-lived')).toBeNull();
    });

    it('should return cache stats', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);

      await cache.set('key1', { data: 'a' });
      await cache.set('key2', { data: 'b' });

      const stats = await cache.getStats();

      expect(stats.entries).toBeGreaterThanOrEqual(2);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.dir).toBe(TEST_CACHE_DIR);
    });
  });

  describe('createCache', () => {
    it('should create cache with default options', () => {
      const cache = createCache();
      expect(cache).toBeDefined();
    });

    it('should create cache with custom options', () => {
      const cache = createCache({
        dir: TEST_CACHE_DIR,
        ttl: 60000,
      });
      expect(cache).toBeDefined();
    });

    it('should return null when disabled', () => {
      const cache = createCache({ enabled: false });
      expect(cache).toBeNull();
    });
  });

  describe('FileCache error handling', () => {
    it('should handle corrupted cache entry gracefully', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      const key = 'corrupted-key';

      // Set a valid value first
      await cache.set(key, { data: 'test' });

      // Get the path to the cache file
      const path = join(TEST_CACHE_DIR);

      // Find and corrupt the cache file
      const files = await import('node:fs/promises');
      const entries = await files.readdir(path, { recursive: true });
      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          // Write invalid JSON
          await files.writeFile(join(path, entry), 'invalid json{{{', 'utf-8');
          break;
        }
      }

      // Should return null for corrupted entry and delete it
      const result = await cache.get(key);
      expect(result).toBeNull();
    });

    it('should handle get with invalid version', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      const key = 'version-key';

      // Set a valid value first
      await cache.set(key, { data: 'test' });

      // Get the path to the cache file
      const path = join(TEST_CACHE_DIR);

      // Find and modify the version in cache file
      const files = await import('node:fs/promises');
      const entries = await files.readdir(path, { recursive: true });
      for (const entry of entries) {
        if (entry.endsWith('.json')) {
          const content = await files.readFile(join(path, entry), 'utf-8');
          const parsed = JSON.parse(content);
          parsed.version = 999; // Invalid version
          await files.writeFile(join(path, entry), JSON.stringify(parsed), 'utf-8');
          break;
        }
      }

      // Should return null due to version mismatch
      const result = await cache.get(key);
      expect(result).toBeNull();
    });
  });

  describe('FileCache additional', () => {
    it('should return cache directory', () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      expect(cache.getDir()).toBe(TEST_CACHE_DIR);
    });

    it('should return default TTL', () => {
      const cache = new FileCache(TEST_CACHE_DIR, 5000);
      expect(cache.getDefaultTtl()).toBe(5000);
    });

    it('should use custom TTL when setting', async () => {
      const cache = new FileCache(TEST_CACHE_DIR, 1000000);
      // Set with short TTL
      await cache.set('short-key', { data: 'test' }, 100);

      // Wait for custom TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired even though default TTL is long
      expect(await cache.get('short-key')).toBeNull();
    });

    it('should prune expired entries', async () => {
      const cache = new FileCache(TEST_CACHE_DIR, 50);

      await cache.set('key1', { data: 'a' });
      await cache.set('key2', { data: 'b' });

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 100));

      const removed = await cache.prune();
      expect(removed).toBeGreaterThanOrEqual(2);
    });

    it('should handle prune on empty/nonexistent cache', async () => {
      const cache = new FileCache(join(TEST_CACHE_DIR, 'nonexistent'));
      const removed = await cache.prune();
      expect(removed).toBe(0);
    });

    it('should get stats on empty cache', async () => {
      const cache = new FileCache(join(TEST_CACHE_DIR, 'empty'));
      const stats = await cache.getStats();
      expect(stats.entries).toBe(0);
      expect(stats.size).toBe(0);
    });

    it('should handle delete on nonexistent key', async () => {
      const cache = new FileCache(TEST_CACHE_DIR);
      // Should not throw
      await expect(cache.delete('nonexistent-key')).resolves.not.toThrow();
    });

    it('should handle clear on empty cache', async () => {
      const cache = new FileCache(join(TEST_CACHE_DIR, 'empty-clear'));
      // Should not throw
      await expect(cache.clear()).resolves.not.toThrow();
    });
  });
});

// Test helper functions exported from cache
import { formatBytes, buildPackageCacheKey, buildAICacheKey } from '../../../src/core/cache.js';

describe('cache helpers', () => {
  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(100)).toBe('100 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(2048)).toBe('2.0 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
    });

    it('should format with decimals', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
    });
  });

  describe('buildPackageCacheKey', () => {
    it('should build default cache key', () => {
      expect(buildPackageCacheKey('lodash', '4.17.21')).toBe('pkg:lodash@4.17.21:result');
    });

    it('should build metadata cache key', () => {
      expect(buildPackageCacheKey('lodash', '4.17.21', 'metadata')).toBe('pkg:lodash@4.17.21:metadata');
    });

    it('should build files cache key', () => {
      expect(buildPackageCacheKey('lodash', '4.17.21', 'files')).toBe('pkg:lodash@4.17.21:files');
    });
  });

  describe('buildAICacheKey', () => {
    it('should build AI cache key', () => {
      expect(buildAICacheKey('openai', 'abc123')).toBe('ai:openai:abc123');
    });
  });
});
