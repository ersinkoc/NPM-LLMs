/**
 * Tests for fs.ts error handling paths
 * Uses mocking to test non-ENOENT error scenarios
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock node:fs/promises
vi.mock('node:fs/promises', async () => {
  const actual = await vi.importActual('node:fs/promises');
  return {
    ...actual,
    rm: vi.fn(),
    readdir: vi.fn(),
  };
});

import { rm, readdir } from 'node:fs/promises';
import { deleteDir, listFiles } from '../../../src/utils/fs.js';

describe('fs error handling', () => {
  const mockedRm = vi.mocked(rm);
  const mockedReaddir = vi.mocked(readdir);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deleteDir error handling', () => {
    it('should return true when rm succeeds', async () => {
      mockedRm.mockResolvedValue(undefined);

      const result = await deleteDir('/some/path');

      expect(result).toBe(true);
    });

    it('should return false when rm throws ENOENT', async () => {
      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockedRm.mockRejectedValue(enoentError);

      const result = await deleteDir('/some/nonexistent/path');

      expect(result).toBe(false);
    });

    it('should rethrow non-ENOENT errors', async () => {
      const permError = new Error('Permission denied') as NodeJS.ErrnoException;
      permError.code = 'EPERM';
      mockedRm.mockRejectedValue(permError);

      await expect(deleteDir('/some/protected/path')).rejects.toThrow('Permission denied');
    });

    it('should rethrow EACCES errors', async () => {
      const accessError = new Error('Access denied') as NodeJS.ErrnoException;
      accessError.code = 'EACCES';
      mockedRm.mockRejectedValue(accessError);

      await expect(deleteDir('/some/restricted/path')).rejects.toThrow('Access denied');
    });
  });

  describe('listFiles error handling', () => {
    it('should return empty array when readdir throws ENOENT', async () => {
      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockedReaddir.mockRejectedValue(enoentError);

      const result = await listFiles('/nonexistent/path');

      expect(result).toEqual([]);
    });

    it('should rethrow non-ENOENT errors in listFiles', async () => {
      const permError = new Error('Permission denied') as NodeJS.ErrnoException;
      permError.code = 'EPERM';
      mockedReaddir.mockRejectedValue(permError);

      await expect(listFiles('/protected/path')).rejects.toThrow('Permission denied');
    });

    it('should rethrow EACCES errors in listFiles', async () => {
      const accessError = new Error('Access denied') as NodeJS.ErrnoException;
      accessError.code = 'EACCES';
      mockedReaddir.mockRejectedValue(accessError);

      await expect(listFiles('/restricted/path')).rejects.toThrow('Access denied');
    });
  });
});
