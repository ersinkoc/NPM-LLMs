/**
 * File system utilities for async file operations
 * Uses Node.js built-in fs/promises module
 * @module utils/fs
 */

import { mkdir, readFile, writeFile, unlink, readdir, stat, rm, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { constants as fsConstants } from 'node:fs';

/**
 * Check if a path exists
 * @param path - Path to check
 * @returns True if path exists
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a directory
 * @param path - Path to check
 * @returns True if path is a directory
 */
export async function isDirectory(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a path is a file
 * @param path - Path to check
 * @returns True if path is a file
 */
export async function isFile(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath - Directory path
 * @returns True if created, false if already exists
 */
export async function ensureDir(dirPath: string): Promise<boolean> {
  try {
    await mkdir(dirPath, { recursive: true });
    return true;
  } catch (error) {
    // Directory already exists
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      return false;
    }
    throw error;
  }
}

/**
 * Read a text file
 * @param filePath - Path to file
 * @returns File content
 */
export async function readTextFile(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8');
}

/**
 * Read a JSON file
 * @param filePath - Path to file
 * @returns Parsed JSON
 */
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Write a text file, creating parent directories if needed
 * @param filePath - Path to file
 * @param content - File content
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath));
  await writeFile(filePath, content, 'utf-8');
}

/**
 * Write a JSON file, creating parent directories if needed
 * @param filePath - Path to file
 * @param data - Data to serialize
 * @param pretty - Whether to format the output
 */
export async function writeJsonFile(
  filePath: string,
  data: unknown,
  pretty: boolean = true
): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeTextFile(filePath, content);
}

/**
 * Delete a file if it exists
 * @param filePath - Path to file
 * @returns True if deleted, false if didn't exist
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    await unlink(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Delete a directory recursively
 * @param dirPath - Path to directory
 * @returns True if deleted, false if didn't exist
 */
export async function deleteDir(dirPath: string): Promise<boolean> {
  try {
    await rm(dirPath, { recursive: true, force: true });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * List files in a directory
 * @param dirPath - Path to directory
 * @param recursive - Whether to list recursively
 * @returns Array of file paths (relative to dirPath)
 */
export async function listFiles(dirPath: string, recursive: boolean = false): Promise<string[]> {
  const files: string[] = [];

  async function scanDir(currentPath: string, prefix: string = ''): Promise<void> {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isFile()) {
        files.push(relativePath);
      } else if (entry.isDirectory() && recursive) {
        await scanDir(join(currentPath, entry.name), relativePath);
      }
    }
  }

  try {
    await scanDir(dirPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  return files;
}

/**
 * Get file size in bytes
 * @param filePath - Path to file
 * @returns File size in bytes, or -1 if file doesn't exist
 */
export async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await stat(filePath);
    return stats.size;
  } catch {
    return -1;
  }
}

/**
 * Get directory size in bytes (sum of all files)
 * @param dirPath - Path to directory
 * @returns Total size in bytes
 */
export async function getDirSize(dirPath: string): Promise<number> {
  let totalSize = 0;

  async function scanDir(currentPath: string): Promise<void> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(currentPath, entry.name);
        if (entry.isFile()) {
          const stats = await stat(fullPath);
          totalSize += stats.size;
        } else if (entry.isDirectory()) {
          await scanDir(fullPath);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  await scanDir(dirPath);
  return totalSize;
}

/**
 * Get file modification time
 * @param filePath - Path to file
 * @returns Modification time as Date, or null if file doesn't exist
 */
export async function getModTime(filePath: string): Promise<Date | null> {
  try {
    const stats = await stat(filePath);
    return stats.mtime;
  } catch {
    return null;
  }
}

/**
 * Copy a file
 * @param src - Source path
 * @param dest - Destination path
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(dirname(dest));
  const content = await readFile(src);
  await writeFile(dest, content);
}

/**
 * Find files matching a pattern in a directory
 * @param dirPath - Directory to search
 * @param pattern - Regex pattern to match file names
 * @param recursive - Whether to search recursively
 * @returns Array of matching file paths
 */
export async function findFiles(
  dirPath: string,
  pattern: RegExp,
  recursive: boolean = true
): Promise<string[]> {
  const allFiles = await listFiles(dirPath, recursive);
  return allFiles.filter((file) => pattern.test(file));
}
