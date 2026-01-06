/**
 * HTTP utilities for fetching packages from NPM registry
 * Uses native fetch API (Node 18+) with zero dependencies
 * @module utils/http
 */

import { gunzipSync } from 'node:zlib';
import { DownloadError, TimeoutError } from '../errors.js';

/**
 * Default NPM registry URL
 */
export const DEFAULT_REGISTRY = 'https://registry.npmjs.org';

/**
 * Default request timeout (30 seconds)
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * HTTP request options
 */
export interface HttpOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Registry URL (for NPM requests) */
  registry?: string;
}

/**
 * HTTP response wrapper
 */
export interface HttpResponse<T = unknown> {
  /** Response data */
  data: T;
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Headers;
}

/**
 * Create an AbortController with timeout
 * @param timeout - Timeout in milliseconds
 * @returns AbortController and cleanup function
 */
function createTimeoutController(timeout: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
}

/**
 * Fetch JSON from a URL with timeout support
 * @param url - URL to fetch
 * @param options - HTTP options
 * @returns Response data
 * @throws DownloadError on network/response errors
 * @throws TimeoutError on timeout
 */
export async function fetchJson<T = unknown>(
  url: string,
  options: HttpOptions = {}
): Promise<HttpResponse<T>> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const { controller, cleanup } = createTimeoutController(timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new DownloadError(`HTTP ${response.status}: ${response.statusText}`, url);
    }

    const data = (await response.json()) as T;
    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  } catch (error) {
    if (error instanceof DownloadError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${timeout}ms`, timeout);
      }
      throw new DownloadError(error.message, url);
    }
    throw new DownloadError('Unknown fetch error', url);
  } finally {
    cleanup();
  }
}

/**
 * Fetch binary data from a URL
 * @param url - URL to fetch
 * @param options - HTTP options
 * @returns ArrayBuffer of response
 * @throws DownloadError on network/response errors
 * @throws TimeoutError on timeout
 */
export async function fetchBinary(
  url: string,
  options: HttpOptions = {}
): Promise<HttpResponse<ArrayBuffer>> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const { controller, cleanup } = createTimeoutController(timeout);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/octet-stream',
        ...options.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new DownloadError(`HTTP ${response.status}: ${response.statusText}`, url);
    }

    const data = await response.arrayBuffer();
    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  } catch (error) {
    if (error instanceof DownloadError) {
      throw error;
    }
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new TimeoutError(`Request timed out after ${timeout}ms`, timeout);
      }
      throw new DownloadError(error.message, url);
    }
    throw new DownloadError('Unknown fetch error', url);
  } finally {
    cleanup();
  }
}

/**
 * Fetch and decompress a gzipped tarball
 * @param url - Tarball URL
 * @param options - HTTP options
 * @returns Decompressed buffer
 * @throws DownloadError on network/response errors
 */
export async function fetchGzipped(
  url: string,
  options: HttpOptions = {}
): Promise<Buffer> {
  const { data: gzipped } = await fetchBinary(url, options);
  try {
    return gunzipSync(Buffer.from(gzipped));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown decompression error';
    throw new DownloadError(`Failed to decompress gzip: ${message}`, url);
  }
}

/**
 * Encode a package name for URL
 * Handles scoped packages: @scope/name → @scope%2Fname
 * @param name - Package name
 * @returns URL-safe package name
 */
export function encodePackageName(name: string): string {
  if (name.startsWith('@')) {
    // Scoped package: @scope/name → @scope%2Fname
    const slashIndex = name.indexOf('/');
    if (slashIndex === -1) {
      return encodeURIComponent(name);
    }
    const scope = name.slice(0, slashIndex);
    const pkg = name.slice(slashIndex + 1);
    return `${scope}%2F${encodeURIComponent(pkg)}`;
  }
  return encodeURIComponent(name);
}

/**
 * Build NPM registry URL for a package
 * @param name - Package name
 * @param version - Optional version
 * @param registry - Registry URL
 * @returns Full URL
 */
export function buildPackageUrl(
  name: string,
  version?: string,
  registry: string = DEFAULT_REGISTRY
): string {
  const encodedName = encodePackageName(name);
  const base = `${registry}/${encodedName}`;
  return version ? `${base}/${version}` : base;
}

/**
 * Validate HTTP status
 * @param status - HTTP status code
 * @param url - Request URL for error message
 * @throws DownloadError if status is not OK
 */
export function validateStatus(status: number, url: string): void {
  if (status < 200 || status >= 300) {
    throw new DownloadError(`HTTP ${status}`, url);
  }
}
