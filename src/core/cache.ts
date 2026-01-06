/**
 * File-based cache with TTL support
 * Caches package data and AI responses to reduce API calls
 * @module core/cache
 */

import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { CacheError } from '../errors.js';
import type { CacheStats, CacheOptions } from '../types.js';
import {
  ensureDir,
  readJsonFile,
  writeJsonFile,
  deleteFile,
  deleteDir,
  listFiles,
  getFileSize,
  exists,
  getDirSize,
} from '../utils/fs.js';

/**
 * Default cache directory
 */
export const DEFAULT_CACHE_DIR = '.npm-llms-cache';

/**
 * Default TTL: 7 days in milliseconds
 */
export const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000;

/**
 * Cache entry metadata
 */
interface CacheEntry<T> {
  /** Cached data */
  data: T;
  /** Timestamp when cached */
  timestamp: number;
  /** TTL in milliseconds */
  ttl: number;
  /** Cache key */
  key: string;
  /** Version for cache invalidation */
  version: number;
}

/**
 * Current cache format version
 */
const CACHE_VERSION = 1;

/**
 * File-based cache implementation
 * @example
 * ```typescript
 * const cache = new FileCache('.cache', 3600000); // 1 hour TTL
 *
 * // Get cached data
 * const data = await cache.get<MyData>('my-key');
 *
 * // Set cached data
 * await cache.set('my-key', myData);
 *
 * // Clear cache
 * await cache.clear();
 * ```
 */
export class FileCache {
  private readonly dir: string;
  private readonly defaultTtl: number;

  /**
   * Create a new FileCache
   * @param dir - Cache directory path
   * @param defaultTtl - Default TTL in milliseconds
   */
  constructor(dir?: string, defaultTtl: number = DEFAULT_TTL) {
    this.dir = dir ?? join(tmpdir(), DEFAULT_CACHE_DIR);
    this.defaultTtl = defaultTtl;
  }

  /**
   * Generate a cache key hash
   * @param input - Input string
   * @returns Hashed key
   */
  private getKey(input: string): string {
    return createHash('sha256').update(input).digest('hex').slice(0, 16);
  }

  /**
   * Get file path for a cache key
   * @param key - Cache key
   * @returns File path
   */
  private getPath(key: string): string {
    const hash = this.getKey(key);
    // Use first 2 chars as subdirectory for better file system performance
    return join(this.dir, hash.slice(0, 2), `${hash}.json`);
  }

  /**
   * Get cached data
   * @param key - Cache key
   * @returns Cached data or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    const path = this.getPath(key);

    try {
      if (!(await exists(path))) {
        return null;
      }

      const entry = await readJsonFile<CacheEntry<T>>(path);

      // Check version
      if (entry.version !== CACHE_VERSION) {
        await this.delete(key);
        return null;
      }

      // Check TTL
      const age = Date.now() - entry.timestamp;
      if (age > entry.ttl) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch {
      // Cache miss or corrupted entry
      try {
        await this.delete(key);
      } catch {
        // Ignore delete errors
      }
      return null;
    }
  }

  /**
   * Set cached data
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Optional TTL override
   */
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const path = this.getPath(key);

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      key,
      version: CACHE_VERSION,
    };

    try {
      await writeJsonFile(path, entry, false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CacheError(`Failed to write cache: ${message}`);
    }
  }

  /**
   * Delete a cached entry
   * @param key - Cache key
   * @returns True if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    const path = this.getPath(key);
    return deleteFile(path);
  }

  /**
   * Check if a key is cached and not expired
   * @param key - Cache key
   * @returns True if cached and valid
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Clear all cached data
   */
  async clear(): Promise<void> {
    try {
      await deleteDir(this.dir);
      await ensureDir(this.dir);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new CacheError(`Failed to clear cache: ${message}`);
    }
  }

  /**
   * Remove expired entries
   * @returns Number of entries removed
   */
  async prune(): Promise<number> {
    let removed = 0;

    try {
      const files = await listFiles(this.dir, true);

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const path = join(this.dir, file);
        try {
          const entry = await readJsonFile<CacheEntry<unknown>>(path);

          // Check version and TTL
          const expired =
            entry.version !== CACHE_VERSION || Date.now() - entry.timestamp > entry.ttl;

          if (expired) {
            await deleteFile(path);
            removed++;
          }
        } catch {
          // Remove corrupted entries
          await deleteFile(path);
          removed++;
        }
      }
    } catch {
      // Ignore errors during pruning
    }

    return removed;
  }

  /**
   * Get cache statistics
   * @returns Cache stats
   */
  async getStats(): Promise<CacheStats> {
    try {
      if (!(await exists(this.dir))) {
        return { entries: 0, size: 0, dir: this.dir };
      }

      const files = await listFiles(this.dir, true);
      const jsonFiles = files.filter((f) => f.endsWith('.json'));
      const size = await getDirSize(this.dir);

      return {
        entries: jsonFiles.length,
        size,
        dir: this.dir,
      };
    } catch {
      return { entries: 0, size: 0, dir: this.dir };
    }
  }

  /**
   * Get cache directory path
   */
  getDir(): string {
    return this.dir;
  }

  /**
   * Get default TTL
   */
  getDefaultTtl(): number {
    return this.defaultTtl;
  }
}

/**
 * Create a file cache from options
 * @param options - Cache options
 * @returns FileCache instance or null if disabled
 */
export function createCache(options?: CacheOptions): FileCache | null {
  if (options?.enabled === false) {
    return null;
  }

  const dir = options?.dir ?? join(process.cwd(), DEFAULT_CACHE_DIR);
  const ttl = options?.ttl ?? DEFAULT_TTL;

  return new FileCache(dir, ttl);
}

/**
 * Format bytes for display
 * @param bytes - Byte count
 * @returns Formatted string
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Build cache key for a package
 * @param name - Package name
 * @param version - Package version
 * @param type - Cache type
 * @returns Cache key
 */
export function buildPackageCacheKey(
  name: string,
  version: string,
  type: 'metadata' | 'files' | 'result' = 'result'
): string {
  return `pkg:${name}@${version}:${type}`;
}

/**
 * Build cache key for AI response
 * @param provider - AI provider name
 * @param promptHash - Hash of the prompt
 * @returns Cache key
 */
export function buildAICacheKey(provider: string, promptHash: string): string {
  return `ai:${provider}:${promptHash}`;
}
