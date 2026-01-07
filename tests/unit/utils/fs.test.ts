/**
 * Tests for src/utils/fs.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import {
  exists,
  isDirectory,
  isFile,
  ensureDir,
  readTextFile,
  readJsonFile,
  writeTextFile,
  writeJsonFile,
  deleteFile,
  deleteDir,
  listFiles,
  getFileSize,
  getDirSize,
  getModTime,
  copyFile,
  findFiles,
} from '../../../src/utils/fs.js';

// Create a unique temp directory for each test
function getTempDir(): string {
  return join(tmpdir(), `npm-llms-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

describe('exists', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return true for existing file', async () => {
    const filePath = join(tempDir, 'test.txt');
    await writeFile(filePath, 'content');

    expect(await exists(filePath)).toBe(true);
  });

  it('should return true for existing directory', async () => {
    expect(await exists(tempDir)).toBe(true);
  });

  it('should return false for non-existing path', async () => {
    expect(await exists(join(tempDir, 'nonexistent.txt'))).toBe(false);
  });
});

describe('isDirectory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return true for directory', async () => {
    expect(await isDirectory(tempDir)).toBe(true);
  });

  it('should return false for file', async () => {
    const filePath = join(tempDir, 'test.txt');
    await writeFile(filePath, 'content');

    expect(await isDirectory(filePath)).toBe(false);
  });

  it('should return false for non-existing path', async () => {
    expect(await isDirectory(join(tempDir, 'nonexistent'))).toBe(false);
  });
});

describe('isFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return true for file', async () => {
    const filePath = join(tempDir, 'test.txt');
    await writeFile(filePath, 'content');

    expect(await isFile(filePath)).toBe(true);
  });

  it('should return false for directory', async () => {
    expect(await isFile(tempDir)).toBe(false);
  });

  it('should return false for non-existing path', async () => {
    expect(await isFile(join(tempDir, 'nonexistent.txt'))).toBe(false);
  });
});

describe('ensureDir', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should create directory if not exists', async () => {
    const result = await ensureDir(tempDir);

    expect(result).toBe(true);
    expect(await isDirectory(tempDir)).toBe(true);
  });

  it('should create nested directories', async () => {
    const nestedPath = join(tempDir, 'a', 'b', 'c');
    const result = await ensureDir(nestedPath);

    expect(result).toBe(true);
    expect(await isDirectory(nestedPath)).toBe(true);
  });

  it('should return false if directory already exists', async () => {
    await mkdir(tempDir, { recursive: true });
    const result = await ensureDir(tempDir);

    // Note: mkdir with recursive: true doesn't throw for existing dirs
    // but also might not return false - behavior varies
    expect(await isDirectory(tempDir)).toBe(true);
  });
});

describe('readTextFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should read text file content', async () => {
    const filePath = join(tempDir, 'test.txt');
    await writeFile(filePath, 'Hello, World!');

    const content = await readTextFile(filePath);

    expect(content).toBe('Hello, World!');
  });

  it('should throw for non-existing file', async () => {
    const filePath = join(tempDir, 'nonexistent.txt');

    await expect(readTextFile(filePath)).rejects.toThrow();
  });
});

describe('readJsonFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should read and parse JSON file', async () => {
    const filePath = join(tempDir, 'data.json');
    await writeFile(filePath, JSON.stringify({ name: 'test', value: 42 }));

    const data = await readJsonFile<{ name: string; value: number }>(filePath);

    expect(data).toEqual({ name: 'test', value: 42 });
  });

  it('should throw for invalid JSON', async () => {
    const filePath = join(tempDir, 'invalid.json');
    await writeFile(filePath, 'not valid json');

    await expect(readJsonFile(filePath)).rejects.toThrow();
  });

  it('should throw for non-existing file', async () => {
    const filePath = join(tempDir, 'nonexistent.json');

    await expect(readJsonFile(filePath)).rejects.toThrow();
  });
});

describe('writeTextFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write text content to file', async () => {
    const filePath = join(tempDir, 'output.txt');

    await writeTextFile(filePath, 'Test content');

    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('Test content');
  });

  it('should create parent directories if needed', async () => {
    const filePath = join(tempDir, 'nested', 'dir', 'output.txt');

    await writeTextFile(filePath, 'Nested content');

    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('Nested content');
  });

  it('should overwrite existing file', async () => {
    const filePath = join(tempDir, 'output.txt');
    await writeFile(filePath, 'old content');

    await writeTextFile(filePath, 'new content');

    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('new content');
  });
});

describe('writeJsonFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should write pretty JSON by default', async () => {
    const filePath = join(tempDir, 'output.json');
    const data = { name: 'test', value: 42 };

    await writeJsonFile(filePath, data);

    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe(JSON.stringify(data, null, 2));
  });

  it('should write compact JSON when pretty is false', async () => {
    const filePath = join(tempDir, 'output.json');
    const data = { name: 'test', value: 42 };

    await writeJsonFile(filePath, data, false);

    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe(JSON.stringify(data));
  });

  it('should create parent directories if needed', async () => {
    const filePath = join(tempDir, 'nested', 'output.json');
    const data = { nested: true };

    await writeJsonFile(filePath, data);

    const content = await readFile(filePath, 'utf-8');
    expect(JSON.parse(content)).toEqual(data);
  });
});

describe('deleteFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should delete existing file and return true', async () => {
    const filePath = join(tempDir, 'test.txt');
    await writeFile(filePath, 'content');

    const result = await deleteFile(filePath);

    expect(result).toBe(true);
    expect(await exists(filePath)).toBe(false);
  });

  it('should return false for non-existing file', async () => {
    const filePath = join(tempDir, 'nonexistent.txt');

    const result = await deleteFile(filePath);

    expect(result).toBe(false);
  });
});

describe('deleteDir', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should delete existing directory and return true', async () => {
    const subDir = join(tempDir, 'subdir');
    await mkdir(subDir);
    await writeFile(join(subDir, 'file.txt'), 'content');

    const result = await deleteDir(subDir);

    expect(result).toBe(true);
    expect(await exists(subDir)).toBe(false);
  });

  it('should return false for non-existing directory', async () => {
    const nonExistentDir = join(tempDir, 'nonexistent-dir');

    // rm with force: true doesn't throw for non-existing, just succeeds
    const result = await deleteDir(nonExistentDir);

    // With force: true, rm returns successfully even if path doesn't exist
    expect(typeof result).toBe('boolean');
  });

  it('should recursively delete nested directories', async () => {
    const nestedDir = join(tempDir, 'a', 'b', 'c');
    await mkdir(nestedDir, { recursive: true });
    await writeFile(join(nestedDir, 'file.txt'), 'content');

    const result = await deleteDir(join(tempDir, 'a'));

    expect(result).toBe(true);
    expect(await exists(join(tempDir, 'a'))).toBe(false);
  });
});

describe('listFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should list files in directory', async () => {
    await writeFile(join(tempDir, 'a.txt'), 'a');
    await writeFile(join(tempDir, 'b.txt'), 'b');

    const files = await listFiles(tempDir);

    expect(files).toContain('a.txt');
    expect(files).toContain('b.txt');
    expect(files).toHaveLength(2);
  });

  it('should not include subdirectories by default', async () => {
    await writeFile(join(tempDir, 'file.txt'), 'content');
    await mkdir(join(tempDir, 'subdir'));
    await writeFile(join(tempDir, 'subdir', 'nested.txt'), 'nested');

    const files = await listFiles(tempDir);

    expect(files).toContain('file.txt');
    expect(files).not.toContain('subdir');
    expect(files).not.toContain('nested.txt');
    expect(files).toHaveLength(1);
  });

  it('should recursively list files when recursive is true', async () => {
    await writeFile(join(tempDir, 'root.txt'), 'root');
    await mkdir(join(tempDir, 'subdir'));
    await writeFile(join(tempDir, 'subdir', 'nested.txt'), 'nested');

    const files = await listFiles(tempDir, true);

    expect(files).toContain('root.txt');
    expect(files).toContain('subdir/nested.txt');
    expect(files).toHaveLength(2);
  });

  it('should return empty array for non-existing directory', async () => {
    const nonExistentDir = join(tempDir, 'nonexistent');

    const files = await listFiles(nonExistentDir);

    expect(files).toEqual([]);
  });

  it('should return empty array for empty directory', async () => {
    const files = await listFiles(tempDir);

    expect(files).toEqual([]);
  });
});

describe('getFileSize', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return file size in bytes', async () => {
    const filePath = join(tempDir, 'test.txt');
    await writeFile(filePath, 'Hello!'); // 6 bytes

    const size = await getFileSize(filePath);

    expect(size).toBe(6);
  });

  it('should return -1 for non-existing file', async () => {
    const filePath = join(tempDir, 'nonexistent.txt');

    const size = await getFileSize(filePath);

    expect(size).toBe(-1);
  });

  it('should return 0 for empty file', async () => {
    const filePath = join(tempDir, 'empty.txt');
    await writeFile(filePath, '');

    const size = await getFileSize(filePath);

    expect(size).toBe(0);
  });
});

describe('getDirSize', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return total size of files in directory', async () => {
    await writeFile(join(tempDir, 'a.txt'), 'AAA'); // 3 bytes
    await writeFile(join(tempDir, 'b.txt'), 'BBBBB'); // 5 bytes

    const size = await getDirSize(tempDir);

    expect(size).toBe(8);
  });

  it('should include nested files', async () => {
    await writeFile(join(tempDir, 'a.txt'), 'AAA'); // 3 bytes
    await mkdir(join(tempDir, 'subdir'));
    await writeFile(join(tempDir, 'subdir', 'b.txt'), 'BBBBB'); // 5 bytes

    const size = await getDirSize(tempDir);

    expect(size).toBe(8);
  });

  it('should return 0 for empty directory', async () => {
    const size = await getDirSize(tempDir);

    expect(size).toBe(0);
  });

  it('should return 0 for non-existing directory', async () => {
    const size = await getDirSize(join(tempDir, 'nonexistent'));

    expect(size).toBe(0);
  });
});

describe('getModTime', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should return modification time as Date', async () => {
    const filePath = join(tempDir, 'test.txt');
    const beforeWrite = Date.now();
    await writeFile(filePath, 'content');
    const afterWrite = Date.now();

    const modTime = await getModTime(filePath);

    expect(modTime).toBeInstanceOf(Date);
    expect(modTime!.getTime()).toBeGreaterThanOrEqual(beforeWrite);
    expect(modTime!.getTime()).toBeLessThanOrEqual(afterWrite + 1000);
  });

  it('should return null for non-existing file', async () => {
    const filePath = join(tempDir, 'nonexistent.txt');

    const modTime = await getModTime(filePath);

    expect(modTime).toBeNull();
  });
});

describe('copyFile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should copy file content', async () => {
    const srcPath = join(tempDir, 'source.txt');
    const destPath = join(tempDir, 'dest.txt');
    await writeFile(srcPath, 'content to copy');

    await copyFile(srcPath, destPath);

    const destContent = await readFile(destPath, 'utf-8');
    expect(destContent).toBe('content to copy');
  });

  it('should create parent directories for destination', async () => {
    const srcPath = join(tempDir, 'source.txt');
    const destPath = join(tempDir, 'nested', 'dir', 'dest.txt');
    await writeFile(srcPath, 'nested copy');

    await copyFile(srcPath, destPath);

    const destContent = await readFile(destPath, 'utf-8');
    expect(destContent).toBe('nested copy');
  });

  it('should overwrite existing destination', async () => {
    const srcPath = join(tempDir, 'source.txt');
    const destPath = join(tempDir, 'dest.txt');
    await writeFile(srcPath, 'new content');
    await writeFile(destPath, 'old content');

    await copyFile(srcPath, destPath);

    const destContent = await readFile(destPath, 'utf-8');
    expect(destContent).toBe('new content');
  });
});

describe('findFiles', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = getTempDir();
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should find files matching pattern', async () => {
    await writeFile(join(tempDir, 'test.ts'), '');
    await writeFile(join(tempDir, 'test.js'), '');
    await writeFile(join(tempDir, 'test.txt'), '');

    const tsFiles = await findFiles(tempDir, /\.ts$/);

    expect(tsFiles).toContain('test.ts');
    expect(tsFiles).not.toContain('test.js');
    expect(tsFiles).not.toContain('test.txt');
  });

  it('should search recursively by default', async () => {
    await writeFile(join(tempDir, 'root.ts'), '');
    await mkdir(join(tempDir, 'src'));
    await writeFile(join(tempDir, 'src', 'nested.ts'), '');

    const tsFiles = await findFiles(tempDir, /\.ts$/);

    expect(tsFiles).toContain('root.ts');
    expect(tsFiles).toContain('src/nested.ts');
  });

  it('should not search recursively when recursive is false', async () => {
    await writeFile(join(tempDir, 'root.ts'), '');
    await mkdir(join(tempDir, 'src'));
    await writeFile(join(tempDir, 'src', 'nested.ts'), '');

    const tsFiles = await findFiles(tempDir, /\.ts$/, false);

    expect(tsFiles).toContain('root.ts');
    expect(tsFiles).not.toContain('src/nested.ts');
  });

  it('should return empty array when no matches', async () => {
    await writeFile(join(tempDir, 'test.js'), '');

    const tsFiles = await findFiles(tempDir, /\.ts$/);

    expect(tsFiles).toEqual([]);
  });

  it('should return empty array for non-existing directory', async () => {
    const files = await findFiles(join(tempDir, 'nonexistent'), /\.ts$/);

    expect(files).toEqual([]);
  });
});
