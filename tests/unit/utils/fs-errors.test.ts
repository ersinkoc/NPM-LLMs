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
    mkdir: vi.fn(),
    unlink: vi.fn(),
  };
});

import { rm, readdir, mkdir, unlink } from 'node:fs/promises';
import { deleteDir, listFiles, ensureDir, deleteFile } from '../../../src/utils/fs.js';

describe('fs error handling', () => {
  const mockedRm = vi.mocked(rm);
  const mockedReaddir = vi.mocked(readdir);
  const mockedMkdir = vi.mocked(mkdir);
  const mockedUnlink = vi.mocked(unlink);

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

  describe('ensureDir error handling', () => {
    it('should return true when mkdir succeeds', async () => {
      mockedMkdir.mockResolvedValue(undefined);

      const result = await ensureDir('/some/new/path');

      expect(result).toBe(true);
    });

    it('should return false when mkdir throws EEXIST', async () => {
      const existError = new Error('EEXIST') as NodeJS.ErrnoException;
      existError.code = 'EEXIST';
      mockedMkdir.mockRejectedValue(existError);

      const result = await ensureDir('/existing/path');

      expect(result).toBe(false);
    });

    it('should rethrow non-EEXIST errors in ensureDir', async () => {
      const permError = new Error('Permission denied') as NodeJS.ErrnoException;
      permError.code = 'EPERM';
      mockedMkdir.mockRejectedValue(permError);

      await expect(ensureDir('/protected/path')).rejects.toThrow('Permission denied');
    });
  });

  describe('deleteFile error handling', () => {
    it('should return true when unlink succeeds', async () => {
      mockedUnlink.mockResolvedValue(undefined);

      const result = await deleteFile('/some/file.txt');

      expect(result).toBe(true);
    });

    it('should return false when unlink throws ENOENT', async () => {
      const enoentError = new Error('ENOENT') as NodeJS.ErrnoException;
      enoentError.code = 'ENOENT';
      mockedUnlink.mockRejectedValue(enoentError);

      const result = await deleteFile('/nonexistent/file.txt');

      expect(result).toBe(false);
    });

    it('should rethrow non-ENOENT errors in deleteFile', async () => {
      const permError = new Error('Permission denied') as NodeJS.ErrnoException;
      permError.code = 'EPERM';
      mockedUnlink.mockRejectedValue(permError);

      await expect(deleteFile('/protected/file.txt')).rejects.toThrow('Permission denied');
    });

    it('should rethrow EACCES errors in deleteFile', async () => {
      const accessError = new Error('Access denied') as NodeJS.ErrnoException;
      accessError.code = 'EACCES';
      mockedUnlink.mockRejectedValue(accessError);

      await expect(deleteFile('/restricted/file.txt')).rejects.toThrow('Access denied');
    });
  });
});
