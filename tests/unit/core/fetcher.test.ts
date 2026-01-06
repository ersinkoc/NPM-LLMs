/**
 * Tests for src/core/fetcher.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validatePackageName,
  parsePackageSpec,
} from '../../../src/core/fetcher.js';
import { ValidationError } from '../../../src/errors.js';

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
});
