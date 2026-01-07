/**
 * Error classes and utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  NpmLlmsError,
  PackageNotFoundError,
  VersionNotFoundError,
  DownloadError,
  ParseError,
  AIError,
  PluginError,
  CacheError,
  ConfigError,
  TarError,
  TimeoutError,
  ValidationError,
  isNpmLlmsError,
  getErrorCode,
  wrapError,
} from '../../src/errors.js';

describe('NpmLlmsError', () => {
  it('should create error with message, code and details', () => {
    const error = new NpmLlmsError('Test error', 'TEST_CODE', { foo: 'bar' });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('NpmLlmsError');
  });

  it('should create error without details', () => {
    const error = new NpmLlmsError('Test error', 'TEST_CODE');

    expect(error.details).toBeUndefined();
  });

  it('should be instanceof Error', () => {
    const error = new NpmLlmsError('Test', 'TEST');

    expect(error instanceof Error).toBe(true);
    expect(error instanceof NpmLlmsError).toBe(true);
  });

  it('should have stack trace', () => {
    const error = new NpmLlmsError('Test', 'TEST');

    expect(error.stack).toBeDefined();
    expect(error.stack).toContain('NpmLlmsError');
  });

  describe('toJSON', () => {
    it('should convert to JSON with all fields', () => {
      const error = new NpmLlmsError('Test error', 'TEST_CODE', { key: 'value' });
      const json = error.toJSON();

      expect(json).toEqual({
        name: 'NpmLlmsError',
        message: 'Test error',
        code: 'TEST_CODE',
        details: { key: 'value' },
      });
    });

    it('should handle undefined details', () => {
      const error = new NpmLlmsError('Test', 'TEST');
      const json = error.toJSON();

      expect(json.details).toBeUndefined();
    });
  });
});

describe('PackageNotFoundError', () => {
  it('should create with package name', () => {
    const error = new PackageNotFoundError('my-package');

    expect(error.message).toBe('Package "my-package" not found on npm');
    expect(error.code).toBe('PACKAGE_NOT_FOUND');
    expect(error.details).toEqual({ packageName: 'my-package' });
    expect(error.name).toBe('PackageNotFoundError');
  });

  it('should be instanceof NpmLlmsError', () => {
    const error = new PackageNotFoundError('test');

    expect(error instanceof NpmLlmsError).toBe(true);
    expect(error instanceof PackageNotFoundError).toBe(true);
  });
});

describe('VersionNotFoundError', () => {
  it('should create with package name and version', () => {
    const error = new VersionNotFoundError('lodash', '99.99.99');

    expect(error.message).toBe('Version "99.99.99" not found for package "lodash"');
    expect(error.code).toBe('VERSION_NOT_FOUND');
    expect(error.details).toEqual({ packageName: 'lodash', version: '99.99.99' });
    expect(error.name).toBe('VersionNotFoundError');
  });
});

describe('DownloadError', () => {
  it('should create with message and url', () => {
    const error = new DownloadError('Network timeout', 'https://example.com');

    expect(error.message).toBe('Network timeout');
    expect(error.code).toBe('DOWNLOAD_FAILED');
    expect(error.details).toEqual({ url: 'https://example.com' });
    expect(error.name).toBe('DownloadError');
  });

  it('should create without url', () => {
    const error = new DownloadError('Connection failed');

    expect(error.details).toEqual({ url: undefined });
  });
});

describe('ParseError', () => {
  it('should create with message, file and position', () => {
    const error = new ParseError('Syntax error', 'index.ts', { line: 10, column: 5 });

    expect(error.message).toBe('Syntax error');
    expect(error.code).toBe('PARSE_ERROR');
    expect(error.details).toEqual({
      file: 'index.ts',
      position: { line: 10, column: 5 },
    });
    expect(error.name).toBe('ParseError');
  });

  it('should create with just message', () => {
    const error = new ParseError('Parse failed');

    expect(error.details).toEqual({ file: undefined, position: undefined });
  });
});

describe('AIError', () => {
  it('should create with message and provider', () => {
    const error = new AIError('Rate limit', 'claude');

    expect(error.message).toBe('Rate limit');
    expect(error.code).toBe('AI_ERROR');
    expect(error.details).toEqual({ provider: 'claude' });
    expect(error.name).toBe('AIError');
  });

  it('should create without provider', () => {
    const error = new AIError('Unknown error');

    expect(error.details).toEqual({ provider: undefined });
  });
});

describe('PluginError', () => {
  it('should create with message and plugin name', () => {
    const error = new PluginError('Init failed', 'my-plugin');

    expect(error.message).toBe('Init failed');
    expect(error.code).toBe('PLUGIN_ERROR');
    expect(error.details).toEqual({ pluginName: 'my-plugin' });
    expect(error.name).toBe('PluginError');
  });

  it('should create without plugin name', () => {
    const error = new PluginError('Plugin error');

    expect(error.details).toEqual({ pluginName: undefined });
  });
});

describe('CacheError', () => {
  it('should create with message', () => {
    const error = new CacheError('Cache write failed');

    expect(error.message).toBe('Cache write failed');
    expect(error.code).toBe('CACHE_ERROR');
    expect(error.details).toBeUndefined();
    expect(error.name).toBe('CacheError');
  });
});

describe('ConfigError', () => {
  it('should create with message', () => {
    const error = new ConfigError('Invalid configuration');

    expect(error.message).toBe('Invalid configuration');
    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.details).toBeUndefined();
    expect(error.name).toBe('ConfigError');
  });
});

describe('TarError', () => {
  it('should create with message and offset', () => {
    const error = new TarError('Invalid header', 512);

    expect(error.message).toBe('Invalid header');
    expect(error.code).toBe('TAR_ERROR');
    expect(error.details).toEqual({ offset: 512 });
    expect(error.name).toBe('TarError');
  });

  it('should create without offset', () => {
    const error = new TarError('Extraction failed');

    expect(error.details).toEqual({ offset: undefined });
  });
});

describe('TimeoutError', () => {
  it('should create with message and timeout', () => {
    const error = new TimeoutError('Request timed out', 30000);

    expect(error.message).toBe('Request timed out');
    expect(error.code).toBe('TIMEOUT_ERROR');
    expect(error.details).toEqual({ timeout: 30000 });
    expect(error.name).toBe('TimeoutError');
  });

  it('should create without timeout', () => {
    const error = new TimeoutError('Timeout');

    expect(error.details).toEqual({ timeout: undefined });
  });
});

describe('ValidationError', () => {
  it('should create with message and field', () => {
    const error = new ValidationError('Invalid value', 'packageName');

    expect(error.message).toBe('Invalid value');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toEqual({ field: 'packageName' });
    expect(error.name).toBe('ValidationError');
  });

  it('should create without field', () => {
    const error = new ValidationError('Validation failed');

    expect(error.details).toEqual({ field: undefined });
  });
});

describe('isNpmLlmsError', () => {
  it('should return true for NpmLlmsError', () => {
    const error = new NpmLlmsError('Test', 'TEST');
    expect(isNpmLlmsError(error)).toBe(true);
  });

  it('should return true for subclass errors', () => {
    expect(isNpmLlmsError(new PackageNotFoundError('pkg'))).toBe(true);
    expect(isNpmLlmsError(new VersionNotFoundError('pkg', '1.0.0'))).toBe(true);
    expect(isNpmLlmsError(new DownloadError('error'))).toBe(true);
    expect(isNpmLlmsError(new ParseError('error'))).toBe(true);
    expect(isNpmLlmsError(new AIError('error'))).toBe(true);
    expect(isNpmLlmsError(new PluginError('error'))).toBe(true);
    expect(isNpmLlmsError(new CacheError('error'))).toBe(true);
    expect(isNpmLlmsError(new ConfigError('error'))).toBe(true);
    expect(isNpmLlmsError(new TarError('error'))).toBe(true);
    expect(isNpmLlmsError(new TimeoutError('error'))).toBe(true);
    expect(isNpmLlmsError(new ValidationError('error'))).toBe(true);
  });

  it('should return false for regular Error', () => {
    const error = new Error('Test');
    expect(isNpmLlmsError(error)).toBe(false);
  });

  it('should return false for non-error values', () => {
    expect(isNpmLlmsError(null)).toBe(false);
    expect(isNpmLlmsError(undefined)).toBe(false);
    expect(isNpmLlmsError('error')).toBe(false);
    expect(isNpmLlmsError(123)).toBe(false);
    expect(isNpmLlmsError({})).toBe(false);
  });
});

describe('getErrorCode', () => {
  it('should return code from NpmLlmsError', () => {
    const error = new NpmLlmsError('Test', 'MY_CODE');
    expect(getErrorCode(error)).toBe('MY_CODE');
  });

  it('should return code from subclass errors', () => {
    expect(getErrorCode(new PackageNotFoundError('pkg'))).toBe('PACKAGE_NOT_FOUND');
    expect(getErrorCode(new CacheError('error'))).toBe('CACHE_ERROR');
    expect(getErrorCode(new ConfigError('error'))).toBe('CONFIG_ERROR');
  });

  it('should return UNKNOWN_ERROR for regular Error', () => {
    const error = new Error('Test');
    expect(getErrorCode(error)).toBe('UNKNOWN_ERROR');
  });

  it('should return UNKNOWN_ERROR for non-error values', () => {
    expect(getErrorCode(null)).toBe('UNKNOWN_ERROR');
    expect(getErrorCode(undefined)).toBe('UNKNOWN_ERROR');
    expect(getErrorCode('string error')).toBe('UNKNOWN_ERROR');
    expect(getErrorCode(42)).toBe('UNKNOWN_ERROR');
  });
});

describe('wrapError', () => {
  it('should return same error if already NpmLlmsError', () => {
    const original = new NpmLlmsError('Test', 'ORIGINAL');
    const wrapped = wrapError(original, 'NEW_CODE');

    expect(wrapped).toBe(original);
    expect(wrapped.code).toBe('ORIGINAL');
  });

  it('should wrap regular Error with message', () => {
    const original = new Error('Original message');
    const wrapped = wrapError(original, 'WRAPPED');

    expect(wrapped instanceof NpmLlmsError).toBe(true);
    expect(wrapped.message).toBe('Original message');
    expect(wrapped.code).toBe('WRAPPED');
    expect(wrapped.details?.originalError).toBe('Error');
  });

  it('should wrap string error', () => {
    const wrapped = wrapError('string error', 'STRING_ERROR');

    expect(wrapped instanceof NpmLlmsError).toBe(true);
    expect(wrapped.message).toBe('string error');
    expect(wrapped.code).toBe('STRING_ERROR');
    expect(wrapped.details?.originalError).toBe('string');
  });

  it('should wrap number error', () => {
    const wrapped = wrapError(42, 'NUMBER_ERROR');

    expect(wrapped.message).toBe('42');
    expect(wrapped.code).toBe('NUMBER_ERROR');
    expect(wrapped.details?.originalError).toBe('number');
  });

  it('should wrap null', () => {
    const wrapped = wrapError(null, 'NULL_ERROR');

    expect(wrapped.message).toBe('null');
    expect(wrapped.details?.originalError).toBe('object');
  });

  it('should wrap undefined', () => {
    const wrapped = wrapError(undefined, 'UNDEFINED_ERROR');

    expect(wrapped.message).toBe('undefined');
    expect(wrapped.details?.originalError).toBe('undefined');
  });

  it('should use default code when not provided', () => {
    const wrapped = wrapError(new Error('Test'));

    expect(wrapped.code).toBe('UNKNOWN_ERROR');
  });

  it('should preserve subclass errors', () => {
    const original = new PackageNotFoundError('pkg');
    const wrapped = wrapError(original);

    expect(wrapped).toBe(original);
    expect(wrapped instanceof PackageNotFoundError).toBe(true);
  });

  it('should wrap TypeError', () => {
    const original = new TypeError('Type mismatch');
    const wrapped = wrapError(original, 'TYPE_ERROR');

    expect(wrapped.message).toBe('Type mismatch');
    expect(wrapped.details?.originalError).toBe('TypeError');
  });

  it('should wrap object converted to string', () => {
    const wrapped = wrapError({ custom: 'error' }, 'OBJECT_ERROR');

    expect(wrapped.message).toBe('[object Object]');
    expect(wrapped.details?.originalError).toBe('object');
  });
});
