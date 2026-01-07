/**
 * Tests for src/utils/tar.ts
 */

import { describe, it, expect } from 'vitest';
import {
  parseTarHeader,
  sanitizePath,
  removePackagePrefix,
  extractTarSync,
  extractTarToMap,
  listTarFiles,
} from '../../../src/utils/tar.js';
import { TarError } from '../../../src/errors.js';

const BLOCK_SIZE = 512;

/**
 * Create a simple tar header for testing
 */
function createTarHeader(options: {
  name: string;
  size?: number;
  type?: string;
  mode?: number;
}): Uint8Array {
  const header = new Uint8Array(BLOCK_SIZE);
  const encoder = new TextEncoder();

  // Name (bytes 0-99)
  const nameBytes = encoder.encode(options.name);
  header.set(nameBytes.slice(0, 100), 0);

  // Mode (bytes 100-107) - octal
  const modeStr = (options.mode ?? 0o644).toString(8).padStart(7, '0');
  header.set(encoder.encode(modeStr), 100);

  // Size (bytes 124-135) - octal
  const sizeStr = (options.size ?? 0).toString(8).padStart(11, '0');
  header.set(encoder.encode(sizeStr), 124);

  // Type flag (byte 156)
  const type = options.type ?? '0';
  header[156] = type.charCodeAt(0) || 0;

  // Magic (bytes 257-262) - "ustar"
  header.set(encoder.encode('ustar'), 257);

  // Calculate and set checksum (bytes 148-155)
  let sum = 0;
  for (let i = 0; i < BLOCK_SIZE; i++) {
    // Checksum field treated as spaces during calculation
    if (i >= 148 && i < 156) {
      sum += 32;
    } else {
      sum += header[i];
    }
  }
  const checksumStr = sum.toString(8).padStart(6, '0') + '\0 ';
  header.set(encoder.encode(checksumStr), 148);

  return header;
}

/**
 * Create a tar archive buffer for testing
 */
function createTarArchive(files: Array<{ name: string; content: string }>): Buffer {
  const parts: Uint8Array[] = [];

  for (const file of files) {
    // Create header
    const header = createTarHeader({
      name: file.name,
      size: file.content.length,
      type: '0',
    });
    parts.push(header);

    // Add content
    const encoder = new TextEncoder();
    const contentBytes = encoder.encode(file.content);
    const paddedContent = new Uint8Array(Math.ceil(contentBytes.length / BLOCK_SIZE) * BLOCK_SIZE);
    paddedContent.set(contentBytes);
    parts.push(paddedContent);
  }

  // Add two zero blocks at end (end-of-archive marker)
  parts.push(new Uint8Array(BLOCK_SIZE));
  parts.push(new Uint8Array(BLOCK_SIZE));

  // Combine all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return Buffer.from(result);
}

describe('sanitizePath', () => {
  it('should pass through normal paths', () => {
    expect(sanitizePath('src/index.ts')).toBe('src/index.ts');
    expect(sanitizePath('package.json')).toBe('package.json');
  });

  it('should remove leading slash', () => {
    expect(sanitizePath('/etc/passwd')).toBe('etc/passwd');
    expect(sanitizePath('/package.json')).toBe('package.json');
  });

  it('should normalize backslashes to forward slashes', () => {
    expect(sanitizePath('src\\index.ts')).toBe('src/index.ts');
  });

  it('should remove dot segments', () => {
    expect(sanitizePath('./src/./index.ts')).toBe('src/index.ts');
  });

  it('should throw on path traversal attempts', () => {
    expect(() => sanitizePath('../etc/passwd')).toThrow(TarError);
    expect(() => sanitizePath('src/../../../etc/passwd')).toThrow(TarError);
    expect(() => sanitizePath('..\\windows\\system32')).toThrow(TarError);
  });

  it('should handle empty path', () => {
    expect(sanitizePath('')).toBe('');
  });
});

describe('removePackagePrefix', () => {
  it('should remove package/ prefix', () => {
    expect(removePackagePrefix('package/index.js')).toBe('index.js');
    expect(removePackagePrefix('package/src/utils.ts')).toBe('src/utils.ts');
  });

  it('should handle backslash prefix', () => {
    expect(removePackagePrefix('package\\index.js')).toBe('index.js');
  });

  it('should return path unchanged without prefix', () => {
    expect(removePackagePrefix('src/index.js')).toBe('src/index.js');
    expect(removePackagePrefix('index.js')).toBe('index.js');
  });
});

describe('parseTarHeader', () => {
  it('should parse a valid tar header', () => {
    const header = createTarHeader({
      name: 'test.txt',
      size: 100,
      type: '0',
    });

    const result = parseTarHeader(header, 0);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('test.txt');
    expect(result!.size).toBe(100);
    expect(result!.type).toBe('0');
  });

  it('should return null for zero block (end-of-archive)', () => {
    const zeroBlock = new Uint8Array(BLOCK_SIZE);
    const result = parseTarHeader(zeroBlock, 0);
    expect(result).toBeNull();
  });

  it('should throw TarError for truncated header', () => {
    const shortBuffer = new Uint8Array(100);
    shortBuffer[0] = 1; // Make it non-zero
    expect(() => parseTarHeader(shortBuffer, 0)).toThrow(TarError);
  });

  it('should handle ustar format with prefix', () => {
    // Create header with prefix built-in (so checksum is correct)
    const header = new Uint8Array(BLOCK_SIZE);
    const encoder = new TextEncoder();

    // Name (bytes 0-99)
    header.set(encoder.encode('index.js'), 0);

    // Mode (bytes 100-107)
    header.set(encoder.encode('0000644'), 100);

    // Size (bytes 124-135)
    header.set(encoder.encode('00000000062'), 124);

    // Type flag (byte 156) - '0' for regular file
    header[156] = 48; // ASCII '0'

    // Magic (bytes 257-262) - "ustar"
    header.set(encoder.encode('ustar'), 257);

    // Prefix (bytes 345-499)
    header.set(encoder.encode('very-long-directory-name'), 345);

    // Calculate checksum treating checksum field as spaces
    let sum = 0;
    for (let i = 0; i < BLOCK_SIZE; i++) {
      if (i >= 148 && i < 156) {
        sum += 32;
      } else {
        sum += header[i];
      }
    }
    const checksumStr = sum.toString(8).padStart(6, '0') + '\0 ';
    header.set(encoder.encode(checksumStr), 148);

    const result = parseTarHeader(header, 0);

    expect(result).not.toBeNull();
    expect(result!.name).toBe('very-long-directory-name/index.js');
  });
});

describe('extractTarSync', () => {
  it('should extract files from tar archive', () => {
    const archive = createTarArchive([
      { name: 'package/index.js', content: 'module.exports = {}' },
      { name: 'package/package.json', content: '{"name":"test"}' },
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(2);
    expect(entries[0].path).toBe('index.js');
    expect(entries[0].content).toBe('module.exports = {}');
    expect(entries[1].path).toBe('package.json');
  });

  it('should filter out files by extension', () => {
    const archive = createTarArchive([
      { name: 'package/index.js', content: 'code' },
      { name: 'package/image.png', content: 'binary' },
      { name: 'package/data.json', content: '{}' },
    ]);

    const entries = Array.from(extractTarSync(archive));

    // Should extract .js and .json, not .png
    expect(entries).toHaveLength(2);
    expect(entries.map(e => e.path)).toContain('index.js');
    expect(entries.map(e => e.path)).toContain('data.json');
  });

  it('should extract TypeScript definition files', () => {
    const archive = createTarArchive([
      { name: 'package/index.d.ts', content: 'declare module' },
      { name: 'package/types.d.mts', content: 'export type' },
      { name: 'package/utils.d.cts', content: 'export interface' },
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(3);
  });

  it('should extract markdown and documentation files', () => {
    const archive = createTarArchive([
      { name: 'package/README.md', content: '# Title' },
      { name: 'package/CHANGELOG.md', content: '## Changes' },
      { name: 'package/LICENSE', content: 'MIT' },
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(3);
  });

  it('should extract YAML and config files', () => {
    const archive = createTarArchive([
      { name: 'package/config.yaml', content: 'key: value' },
      { name: 'package/settings.yml', content: 'setting: true' },
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(2);
  });

  it('should handle empty archive', () => {
    // Just two zero blocks
    const archive = Buffer.from(new Uint8Array(BLOCK_SIZE * 2));

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(0);
  });

  it('should skip directories', () => {
    const header = createTarHeader({
      name: 'package/src',
      size: 0,
      type: '5', // Directory type
    });
    const archive = Buffer.concat([
      header,
      Buffer.alloc(BLOCK_SIZE), // Zero block
      Buffer.alloc(BLOCK_SIZE), // Zero block
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(0);
  });

  it('should work with ArrayBuffer input', () => {
    const archive = createTarArchive([
      { name: 'package/index.js', content: 'test' },
    ]);

    const arrayBuffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength);
    const entries = Array.from(extractTarSync(arrayBuffer));

    expect(entries).toHaveLength(1);
  });
});

describe('extractTarToMap', () => {
  it('should return a Map of files', () => {
    const archive = createTarArchive([
      { name: 'package/index.js', content: 'code here' },
      { name: 'package/readme.md', content: '# Readme' },
    ]);

    const files = extractTarToMap(archive);

    expect(files).toBeInstanceOf(Map);
    expect(files.size).toBe(2);
    expect(files.get('index.js')).toBe('code here');
    expect(files.get('readme.md')).toBe('# Readme');
  });

  it('should handle empty archive', () => {
    const archive = Buffer.from(new Uint8Array(BLOCK_SIZE * 2));

    const files = extractTarToMap(archive);

    expect(files.size).toBe(0);
  });
});

describe('listTarFiles', () => {
  it('should list file paths without extracting content', () => {
    const archive = createTarArchive([
      { name: 'package/index.js', content: 'code' },
      { name: 'package/util.ts', content: 'more code' },
      { name: 'package/data.json', content: '{}' },
    ]);

    const files = listTarFiles(archive);

    expect(files).toHaveLength(3);
    expect(files).toContain('index.js');
    expect(files).toContain('util.ts');
    expect(files).toContain('data.json');
  });

  it('should skip directories', () => {
    const dirHeader = createTarHeader({
      name: 'package/src/',
      size: 0,
      type: '5',
    });
    const fileHeader = createTarHeader({
      name: 'package/index.js',
      size: 4,
    });
    const archive = Buffer.concat([
      dirHeader,
      fileHeader,
      Buffer.from('code'),
      Buffer.alloc(BLOCK_SIZE - 4), // Pad to block size
      Buffer.alloc(BLOCK_SIZE * 2), // End marker
    ]);

    const files = listTarFiles(archive);

    expect(files).toHaveLength(1);
    expect(files).toContain('index.js');
  });

  it('should handle ArrayBuffer input', () => {
    const archive = createTarArchive([
      { name: 'package/test.ts', content: 'test' },
    ]);

    const arrayBuffer = archive.buffer.slice(archive.byteOffset, archive.byteOffset + archive.byteLength);
    const files = listTarFiles(arrayBuffer);

    expect(files).toHaveLength(1);
  });
});

describe('file type filtering', () => {
  it('should extract TypeScript files', () => {
    const archive = createTarArchive([
      { name: 'package/index.ts', content: 'code' },
      { name: 'package/component.tsx', content: 'jsx' },
    ]);

    const entries = Array.from(extractTarSync(archive));
    expect(entries).toHaveLength(2);
  });

  it('should extract JavaScript module files', () => {
    const archive = createTarArchive([
      { name: 'package/index.mjs', content: 'export' },
      { name: 'package/util.cjs', content: 'module' },
      { name: 'package/component.jsx', content: 'jsx' },
    ]);

    const entries = Array.from(extractTarSync(archive));
    expect(entries).toHaveLength(3);
  });

  it('should extract txt files', () => {
    const archive = createTarArchive([
      { name: 'package/notes.txt', content: 'text' },
    ]);

    const entries = Array.from(extractTarSync(archive));
    expect(entries).toHaveLength(1);
  });

  it('should extract LICENSE.md', () => {
    const archive = createTarArchive([
      { name: 'package/LICENSE.md', content: 'MIT License' },
    ]);

    const entries = Array.from(extractTarSync(archive));
    expect(entries).toHaveLength(1);
  });
});

describe('GNU long name extension', () => {
  /**
   * Create a GNU long name header followed by the long name and actual file
   */
  function createGnuLongNameArchive(longName: string, content: string): Buffer {
    const parts: Uint8Array[] = [];
    const encoder = new TextEncoder();

    // GNU Long Name header (type 'L')
    const longNameHeader = createTarHeader({
      name: '././@LongLink',
      size: longName.length,
      type: 'L',
    });
    parts.push(longNameHeader);

    // Long name content padded to block
    const longNameBytes = encoder.encode(longName);
    const paddedLongName = new Uint8Array(Math.ceil(longNameBytes.length / BLOCK_SIZE) * BLOCK_SIZE);
    paddedLongName.set(longNameBytes);
    parts.push(paddedLongName);

    // Actual file header with truncated name
    const actualHeader = createTarHeader({
      name: longName.slice(0, 99),
      size: content.length,
      type: '0',
    });
    parts.push(actualHeader);

    // File content
    const contentBytes = encoder.encode(content);
    const paddedContent = new Uint8Array(Math.ceil(contentBytes.length / BLOCK_SIZE) * BLOCK_SIZE);
    paddedContent.set(contentBytes);
    parts.push(paddedContent);

    // End marker
    parts.push(new Uint8Array(BLOCK_SIZE * 2));

    const total = parts.reduce((s, p) => s + p.length, 0);
    const result = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      result.set(part, offset);
      offset += part.length;
    }

    return Buffer.from(result);
  }

  it('should handle GNU long name for extraction', () => {
    const longPath = 'package/' + 'very-long-directory-name/'.repeat(5) + 'index.js';
    const archive = createGnuLongNameArchive(longPath, 'code');

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(1);
    expect(entries[0].path).toContain('very-long-directory-name');
  });

  it('should handle GNU long name for listTarFiles', () => {
    const longPath = 'package/' + 'very-long-directory-name/'.repeat(5) + 'test.ts';
    const archive = createGnuLongNameArchive(longPath, 'code');

    const files = listTarFiles(archive);

    expect(files).toHaveLength(1);
    expect(files[0]).toContain('very-long-directory-name');
  });
});

describe('symlink handling', () => {
  it('should skip symlinks in extractTarSync', () => {
    const symlinkHeader = createTarHeader({
      name: 'package/link.js',
      size: 0,
      type: '2', // Symlink type
    });
    const fileHeader = createTarHeader({
      name: 'package/real.js',
      size: 4,
      type: '0',
    });
    const archive = Buffer.concat([
      symlinkHeader,
      fileHeader,
      Buffer.from('code'),
      Buffer.alloc(BLOCK_SIZE - 4),
      Buffer.alloc(BLOCK_SIZE * 2),
    ]);

    const entries = Array.from(extractTarSync(archive));

    // Only the real file should be extracted
    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('real.js');
  });

  it('should skip hard links in extractTarSync', () => {
    const linkHeader = createTarHeader({
      name: 'package/hardlink.js',
      size: 0,
      type: '1', // Hard link type
    });
    const fileHeader = createTarHeader({
      name: 'package/original.js',
      size: 4,
      type: '0',
    });
    const archive = Buffer.concat([
      linkHeader,
      fileHeader,
      Buffer.from('code'),
      Buffer.alloc(BLOCK_SIZE - 4),
      Buffer.alloc(BLOCK_SIZE * 2),
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('original.js');
  });
});

describe('unsafe path handling', () => {
  it('should skip files with path traversal in extractTarSync', () => {
    // Create a file with path traversal directly in header
    const header = new Uint8Array(BLOCK_SIZE);
    const encoder = new TextEncoder();

    // Name with path traversal
    header.set(encoder.encode('../../../etc/passwd'), 0);
    header.set(encoder.encode('0000644'), 100);
    header.set(encoder.encode('00000000004'), 124);
    header[156] = 48; // '0' for regular file
    header.set(encoder.encode('ustar'), 257);

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < BLOCK_SIZE; i++) {
      if (i >= 148 && i < 156) sum += 32;
      else sum += header[i];
    }
    header.set(encoder.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);

    const archive = Buffer.concat([
      header,
      Buffer.from('evil'),
      Buffer.alloc(BLOCK_SIZE - 4),
      Buffer.alloc(BLOCK_SIZE * 2),
    ]);

    const entries = Array.from(extractTarSync(archive));

    // File should be skipped due to path traversal
    expect(entries).toHaveLength(0);
  });

  it('should skip files with path traversal in listTarFiles', () => {
    const header = new Uint8Array(BLOCK_SIZE);
    const encoder = new TextEncoder();

    header.set(encoder.encode('../malicious.js'), 0);
    header.set(encoder.encode('0000644'), 100);
    header.set(encoder.encode('00000000004'), 124);
    header[156] = 48;
    header.set(encoder.encode('ustar'), 257);

    let sum = 0;
    for (let i = 0; i < BLOCK_SIZE; i++) {
      if (i >= 148 && i < 156) sum += 32;
      else sum += header[i];
    }
    header.set(encoder.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);

    const archive = Buffer.concat([
      header,
      Buffer.from('evil'),
      Buffer.alloc(BLOCK_SIZE - 4),
      Buffer.alloc(BLOCK_SIZE * 2),
    ]);

    const files = listTarFiles(archive);

    expect(files).toHaveLength(0);
  });
});

describe('old-style file type', () => {
  it('should handle empty type flag as regular file', () => {
    // Old-style tar uses empty type for regular files
    const header = new Uint8Array(BLOCK_SIZE);
    const encoder = new TextEncoder();

    header.set(encoder.encode('package/old-style.js'), 0);
    header.set(encoder.encode('0000644'), 100);
    header.set(encoder.encode('00000000004'), 124);
    header[156] = 0; // Empty type (old-style regular file)
    header.set(encoder.encode('ustar'), 257);

    let sum = 0;
    for (let i = 0; i < BLOCK_SIZE; i++) {
      if (i >= 148 && i < 156) sum += 32;
      else sum += header[i];
    }
    header.set(encoder.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);

    const archive = Buffer.concat([
      header,
      Buffer.from('code'),
      Buffer.alloc(BLOCK_SIZE - 4),
      Buffer.alloc(BLOCK_SIZE * 2),
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('old-style.js');
  });
});

describe('checksum validation', () => {
  it('should throw on invalid checksum', () => {
    const header = new Uint8Array(BLOCK_SIZE);
    const encoder = new TextEncoder();

    header.set(encoder.encode('test.js'), 0);
    header.set(encoder.encode('0000644'), 100);
    header.set(encoder.encode('00000000004'), 124);
    header[156] = 48;
    header.set(encoder.encode('ustar'), 257);

    // Set an incorrect checksum
    header.set(encoder.encode('000001\0 '), 148); // Wrong checksum

    expect(() => parseTarHeader(header, 0)).toThrow(TarError);
  });

  it('should allow zero checksum', () => {
    const header = new Uint8Array(BLOCK_SIZE);
    const encoder = new TextEncoder();

    header.set(encoder.encode('test.js'), 0);
    // Checksum field stays at 0 (all zeros)

    // With most fields at 0, this should be okay
    const result = parseTarHeader(header, 0);
    expect(result).not.toBeNull();
  });
});

describe('non-ustar format', () => {
  it('should handle archives without ustar magic', () => {
    const header = new Uint8Array(BLOCK_SIZE);
    const encoder = new TextEncoder();

    header.set(encoder.encode('package/simple.js'), 0);
    header.set(encoder.encode('0000644'), 100);
    header.set(encoder.encode('00000000004'), 124);
    header[156] = 48;
    // No ustar magic

    let sum = 0;
    for (let i = 0; i < BLOCK_SIZE; i++) {
      if (i >= 148 && i < 156) sum += 32;
      else sum += header[i];
    }
    header.set(encoder.encode(sum.toString(8).padStart(6, '0') + '\0 '), 148);

    const archive = Buffer.concat([
      header,
      Buffer.from('code'),
      Buffer.alloc(BLOCK_SIZE - 4),
      Buffer.alloc(BLOCK_SIZE * 2),
    ]);

    const entries = Array.from(extractTarSync(archive));

    expect(entries).toHaveLength(1);
    expect(entries[0].path).toBe('simple.js');
  });
});
