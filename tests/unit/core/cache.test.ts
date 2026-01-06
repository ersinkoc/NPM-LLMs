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
  });
});
