/**
 * Zero-dependency tar parser for extracting NPM package tarballs
 * Implements the POSIX ustar format specification
 * @module utils/tar
 */

import { TarError } from '../errors.js';
import type { TarEntry, TarHeader } from '../types.js';

/**
 * Tar block size (512 bytes per block)
 */
const BLOCK_SIZE = 512;

/**
 * Tar file type flags
 */
const TAR_TYPES = {
  FILE: '0',
  FILE_ALT: '', // Old-style regular file
  LINK: '1',
  SYMLINK: '2',
  CHARDEV: '3',
  BLOCKDEV: '4',
  DIRECTORY: '5',
  FIFO: '6',
  CONTIGUOUS: '7',
  EXTENDED_HEADER: 'x',
  GLOBAL_EXTENDED_HEADER: 'g',
  GNU_LONGNAME: 'L',
  GNU_LONGLINK: 'K',
} as const;

/**
 * Text decoder for parsing tar headers
 */
const decoder = new TextDecoder('utf-8');

/**
 * Check if a buffer block is all zeros (end-of-archive marker)
 * @param buffer - Buffer to check
 * @param offset - Offset to start checking
 * @returns True if block is all zeros
 */
function isZeroBlock(buffer: Uint8Array, offset: number): boolean {
  const end = Math.min(offset + BLOCK_SIZE, buffer.length);
  for (let i = offset; i < end; i++) {
    if (buffer[i] !== 0) return false;
  }
  return true;
}

/**
 * Parse an octal string from tar header
 * @param buffer - Buffer containing octal string
 * @param offset - Start offset
 * @param length - Length of field
 * @returns Parsed number
 */
function parseOctal(buffer: Uint8Array, offset: number, length: number): number {
  const bytes = buffer.slice(offset, offset + length);
  const str = decoder.decode(bytes).replace(/\0/g, '').trim();
  if (!str) return 0;
  return parseInt(str, 8) || 0;
}

/**
 * Parse a string from tar header
 * @param buffer - Buffer containing string
 * @param offset - Start offset
 * @param length - Length of field
 * @returns Parsed string (null-terminated)
 */
function parseString(buffer: Uint8Array, offset: number, length: number): string {
  const bytes = buffer.slice(offset, offset + length);
  const str = decoder.decode(bytes);
  // Find null terminator
  const nullIndex = str.indexOf('\0');
  return nullIndex >= 0 ? str.slice(0, nullIndex) : str;
}

/**
 * Calculate tar header checksum
 * @param buffer - Header buffer
 * @param offset - Header start offset
 * @returns Calculated checksum
 */
function calculateChecksum(buffer: Uint8Array, offset: number): number {
  let sum = 0;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    // Checksum field (bytes 148-155) treated as spaces
    if (i >= 148 && i < 156) {
      sum += 32; // space character
    } else {
      sum += buffer[offset + i] ?? 0;
    }
  }
  return sum;
}

/**
 * Parse a tar header from buffer
 * @param buffer - Buffer containing tar data
 * @param offset - Offset to header
 * @returns Parsed header or null if end-of-archive
 * @throws TarError if header is invalid
 */
export function parseTarHeader(buffer: Uint8Array, offset: number): TarHeader | null {
  // Check for end-of-archive (two consecutive zero blocks)
  if (isZeroBlock(buffer, offset)) {
    return null;
  }

  // Validate buffer length
  if (offset + BLOCK_SIZE > buffer.length) {
    throw new TarError('Unexpected end of tar archive', offset);
  }

  // Parse header fields according to POSIX ustar format
  // Bytes 0-99: File name
  const name = parseString(buffer, offset, 100);

  // Bytes 100-107: File mode (octal)
  const mode = parseOctal(buffer, offset + 100, 8);

  // Bytes 108-115: Owner user ID (octal)
  const uid = parseOctal(buffer, offset + 108, 8);

  // Bytes 116-123: Owner group ID (octal)
  const gid = parseOctal(buffer, offset + 116, 8);

  // Bytes 124-135: File size (octal)
  const size = parseOctal(buffer, offset + 124, 12);

  // Bytes 136-147: Modification time (octal, Unix timestamp)
  const mtime = parseOctal(buffer, offset + 136, 12);

  // Bytes 148-155: Header checksum (octal)
  const checksum = parseOctal(buffer, offset + 148, 8);

  // Bytes 156: Type flag
  const type = parseString(buffer, offset + 156, 1);

  // Bytes 157-256: Link name
  const linkname = parseString(buffer, offset + 157, 100);

  // Validate checksum
  const calculatedChecksum = calculateChecksum(buffer, offset);
  if (checksum !== 0 && checksum !== calculatedChecksum) {
    throw new TarError(`Invalid tar header checksum: expected ${checksum}, got ${calculatedChecksum}`, offset);
  }

  // Check for ustar format (bytes 257-262: "ustar\0")
  const magic = parseString(buffer, offset + 257, 6);
  let fullName = name;

  if (magic === 'ustar' || magic === 'ustar ') {
    // UStar format: prefix (bytes 345-499) can extend file name
    const prefix = parseString(buffer, offset + 345, 155);
    if (prefix) {
      fullName = `${prefix}/${name}`;
    }
  }

  return {
    name: fullName,
    mode,
    uid,
    gid,
    size,
    mtime,
    checksum,
    type,
    linkname,
  };
}

/**
 * Sanitize file path to prevent directory traversal
 * @param path - Path to sanitize
 * @returns Sanitized path
 * @throws TarError if path is unsafe
 */
export function sanitizePath(path: string): string {
  // Normalize path separators
  let normalized = path.replace(/\\/g, '/');

  // Remove leading slash
  if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }

  // Check for directory traversal attempts
  const parts = normalized.split('/');
  const safeParts: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      throw new TarError(`Path traversal detected: ${path}`);
    }
    if (part && part !== '.') {
      safeParts.push(part);
    }
  }

  return safeParts.join('/');
}

/**
 * Remove common NPM package prefix from path
 * NPM tarballs typically have a 'package/' prefix
 * @param path - Path to clean
 * @returns Path without prefix
 */
export function removePackagePrefix(path: string): string {
  const prefixes = ['package/', 'package\\'];
  for (const prefix of prefixes) {
    if (path.startsWith(prefix)) {
      return path.slice(prefix.length);
    }
  }
  return path;
}

/**
 * Determine entry type from tar type flag
 * @param type - Tar type flag
 * @returns Entry type
 */
function getEntryType(type: string): TarEntry['type'] {
  switch (type) {
    case TAR_TYPES.DIRECTORY:
      return 'directory';
    case TAR_TYPES.SYMLINK:
    case TAR_TYPES.LINK:
      return 'symlink';
    default:
      return 'file';
  }
}

/**
 * Check if file should be extracted (is a text file we care about)
 * @param path - File path
 * @returns True if file should be extracted
 */
function shouldExtract(path: string): boolean {
  const lower = path.toLowerCase();

  // Extract TypeScript definitions
  if (lower.endsWith('.d.ts') || lower.endsWith('.d.mts') || lower.endsWith('.d.cts')) {
    return true;
  }

  // Extract source files
  if (
    lower.endsWith('.ts') ||
    lower.endsWith('.tsx') ||
    lower.endsWith('.js') ||
    lower.endsWith('.mjs') ||
    lower.endsWith('.cjs') ||
    lower.endsWith('.jsx')
  ) {
    return true;
  }

  // Extract documentation
  if (
    lower.endsWith('.md') ||
    lower.endsWith('.txt') ||
    lower.endsWith('.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml')
  ) {
    return true;
  }

  // Extract package.json and config files at root level
  const filename = path.split('/').pop() ?? '';
  if (
    filename === 'package.json' ||
    filename === 'README.md' ||
    filename === 'CHANGELOG.md' ||
    filename === 'LICENSE' ||
    filename === 'LICENSE.md'
  ) {
    return true;
  }

  return false;
}

/**
 * Extract tar entries from buffer
 * @param buffer - Decompressed tar buffer
 * @yields TarEntry for each file
 * @throws TarError on parse errors
 */
export function* extractTarSync(buffer: Buffer | ArrayBuffer): Generator<TarEntry> {
  const data = buffer instanceof Buffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  let offset = 0;
  let gnuLongName: string | null = null;

  while (offset < data.length) {
    // Parse header
    const header = parseTarHeader(data, offset);

    // End of archive
    if (!header) {
      break;
    }

    offset += BLOCK_SIZE;

    // Handle GNU long name extension
    if (header.type === TAR_TYPES.GNU_LONGNAME) {
      const contentBytes = data.slice(offset, offset + header.size);
      gnuLongName = decoder.decode(contentBytes).replace(/\0/g, '');
      offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    // Use GNU long name if present
    const entryName = gnuLongName ?? header.name;
    gnuLongName = null;

    // Skip if not a regular file
    if (header.type !== TAR_TYPES.FILE && header.type !== TAR_TYPES.FILE_ALT) {
      offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    // Sanitize and clean path
    let path: string;
    try {
      path = sanitizePath(entryName);
      path = removePackagePrefix(path);
    } catch {
      // Skip files with unsafe paths
      offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    // Skip if we don't need this file
    if (!shouldExtract(path)) {
      offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    // Extract content
    const content = data.slice(offset, offset + header.size);
    let textContent: string;

    try {
      textContent = decoder.decode(content);
    } catch {
      // Skip binary files that fail to decode
      offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    yield {
      path,
      content: textContent,
      size: header.size,
      type: getEntryType(header.type),
    };

    // Move to next header (content padded to block boundary)
    offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
  }
}

/**
 * Extract tar entries to a Map
 * @param buffer - Decompressed tar buffer
 * @returns Map of path to content
 * @throws TarError on parse errors
 */
export function extractTarToMap(buffer: Buffer | ArrayBuffer): Map<string, string> {
  const files = new Map<string, string>();

  for (const entry of extractTarSync(buffer)) {
    if (entry.type === 'file') {
      files.set(entry.path, entry.content);
    }
  }

  return files;
}

/**
 * List files in tar archive without extracting content
 * @param buffer - Decompressed tar buffer
 * @returns Array of file paths
 */
export function listTarFiles(buffer: Buffer | ArrayBuffer): string[] {
  const data = buffer instanceof Buffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  const files: string[] = [];
  let offset = 0;
  let gnuLongName: string | null = null;

  while (offset < data.length) {
    const header = parseTarHeader(data, offset);
    if (!header) break;

    offset += BLOCK_SIZE;

    if (header.type === TAR_TYPES.GNU_LONGNAME) {
      const contentBytes = data.slice(offset, offset + header.size);
      gnuLongName = decoder.decode(contentBytes).replace(/\0/g, '');
      offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    const entryName = gnuLongName ?? header.name;
    gnuLongName = null;

    if (header.type === TAR_TYPES.FILE || header.type === TAR_TYPES.FILE_ALT) {
      try {
        let path = sanitizePath(entryName);
        path = removePackagePrefix(path);
        files.push(path);
      } catch {
        // Skip unsafe paths
      }
    }

    offset += Math.ceil(header.size / BLOCK_SIZE) * BLOCK_SIZE;
  }

  return files;
}
