/**
 * Custom error classes for @oxog/npm-llms
 * @module errors
 */

/**
 * Base error class for npm-llms
 * @example
 * ```typescript
 * try {
 *   await extractor.extract('nonexistent-package');
 * } catch (error) {
 *   if (error instanceof NpmLlmsError) {
 *     console.log(error.code); // 'PACKAGE_NOT_FOUND'
 *   }
 * }
 * ```
 */
export class NpmLlmsError extends Error {
  /**
   * Create a new NpmLlmsError
   * @param message - Error message
   * @param code - Error code
   * @param details - Additional error details
   */
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'NpmLlmsError';
    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Convert error to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Error thrown when a package is not found on npm
 * @example
 * ```typescript
 * throw new PackageNotFoundError('nonexistent-package');
 * // Error: Package "nonexistent-package" not found on npm
 * ```
 */
export class PackageNotFoundError extends NpmLlmsError {
  constructor(packageName: string) {
    super(`Package "${packageName}" not found on npm`, 'PACKAGE_NOT_FOUND', { packageName });
    this.name = 'PackageNotFoundError';
  }
}

/**
 * Error thrown when a specific version is not found
 * @example
 * ```typescript
 * throw new VersionNotFoundError('lodash', '99.99.99');
 * // Error: Version "99.99.99" not found for package "lodash"
 * ```
 */
export class VersionNotFoundError extends NpmLlmsError {
  constructor(packageName: string, version: string) {
    super(`Version "${version}" not found for package "${packageName}"`, 'VERSION_NOT_FOUND', {
      packageName,
      version,
    });
    this.name = 'VersionNotFoundError';
  }
}

/**
 * Error thrown when a download fails
 * @example
 * ```typescript
 * throw new DownloadError('Network timeout', 'https://registry.npmjs.org/...');
 * ```
 */
export class DownloadError extends NpmLlmsError {
  constructor(message: string, url?: string) {
    super(message, 'DOWNLOAD_FAILED', { url });
    this.name = 'DownloadError';
  }
}

/**
 * Error thrown when parsing fails
 * @example
 * ```typescript
 * throw new ParseError('Invalid TypeScript syntax', 'index.d.ts');
 * ```
 */
export class ParseError extends NpmLlmsError {
  constructor(message: string, file?: string, position?: { line: number; column: number }) {
    super(message, 'PARSE_ERROR', { file, position });
    this.name = 'ParseError';
  }
}

/**
 * Error thrown when AI provider fails
 * @example
 * ```typescript
 * throw new AIError('Rate limit exceeded', 'claude');
 * ```
 */
export class AIError extends NpmLlmsError {
  constructor(message: string, provider?: string) {
    super(message, 'AI_ERROR', { provider });
    this.name = 'AIError';
  }
}

/**
 * Error thrown when a plugin fails
 * @example
 * ```typescript
 * throw new PluginError('Plugin "custom-parser" failed to initialize', 'custom-parser');
 * ```
 */
export class PluginError extends NpmLlmsError {
  constructor(message: string, pluginName?: string) {
    super(message, 'PLUGIN_ERROR', { pluginName });
    this.name = 'PluginError';
  }
}

/**
 * Error thrown when cache operation fails
 * @example
 * ```typescript
 * throw new CacheError('Failed to write to cache directory');
 * ```
 */
export class CacheError extends NpmLlmsError {
  constructor(message: string) {
    super(message, 'CACHE_ERROR');
    this.name = 'CacheError';
  }
}

/**
 * Error thrown when configuration is invalid
 * @example
 * ```typescript
 * throw new ConfigError('Invalid AI provider: "invalid"');
 * ```
 */
export class ConfigError extends NpmLlmsError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

/**
 * Error thrown when tar extraction fails
 * @example
 * ```typescript
 * throw new TarError('Invalid tar header at offset 512');
 * ```
 */
export class TarError extends NpmLlmsError {
  constructor(message: string, offset?: number) {
    super(message, 'TAR_ERROR', { offset });
    this.name = 'TarError';
  }
}

/**
 * Error thrown when a network request times out
 * @example
 * ```typescript
 * throw new TimeoutError('Request timed out after 30000ms', 30000);
 * ```
 */
export class TimeoutError extends NpmLlmsError {
  constructor(message: string, timeout?: number) {
    super(message, 'TIMEOUT_ERROR', { timeout });
    this.name = 'TimeoutError';
  }
}

/**
 * Error thrown when validation fails
 * @example
 * ```typescript
 * throw new ValidationError('Package name cannot be empty');
 * ```
 */
export class ValidationError extends NpmLlmsError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
  }
}

/**
 * Check if an error is a NpmLlmsError
 * @param error - Error to check
 * @returns True if error is a NpmLlmsError
 * @example
 * ```typescript
 * if (isNpmLlmsError(error)) {
 *   console.log(error.code);
 * }
 * ```
 */
export function isNpmLlmsError(error: unknown): error is NpmLlmsError {
  return error instanceof NpmLlmsError;
}

/**
 * Get error code from any error
 * @param error - Error to get code from
 * @returns Error code or 'UNKNOWN_ERROR'
 * @example
 * ```typescript
 * const code = getErrorCode(error); // 'PACKAGE_NOT_FOUND' or 'UNKNOWN_ERROR'
 * ```
 */
export function getErrorCode(error: unknown): string {
  if (isNpmLlmsError(error)) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Wrap any error as NpmLlmsError
 * @param error - Error to wrap
 * @param code - Error code to use
 * @returns NpmLlmsError
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   throw wrapError(error, 'OPERATION_FAILED');
 * }
 * ```
 */
export function wrapError(error: unknown, code: string = 'UNKNOWN_ERROR'): NpmLlmsError {
  if (isNpmLlmsError(error)) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  return new NpmLlmsError(message, code, {
    originalError: error instanceof Error ? error.name : typeof error,
  });
}
