/**
 * Changelog parser plugin for @oxog/npm-llms
 * Parses CHANGELOG.md files in Keep a Changelog format
 * @module plugins/optional/changelog-parser
 */

import type {
  Plugin,
  ExtractorContext,
  Kernel,
  ParsedChangelog,
  ChangelogEntry,
} from '../../types.js';
import { definePlugin } from '../../kernel.js';

/**
 * Parse a changelog file into structured data
 * @param content - Raw changelog content
 * @returns Parsed changelog structure
 */
export function parseChangelog(content: string): ParsedChangelog {
  const versions: ChangelogEntry[] = [];
  const lines = content.split('\n');

  let currentVersion: ChangelogEntry | null = null;
  let currentType: ChangelogEntry['changes'][0]['type'] = 'other';

  // Version header regex: ## [1.0.0] - 2024-01-01 or ## 1.0.0 (2024-01-01)
  const versionRegex = /^##\s+\[?(\d+\.\d+\.\d+(?:-[\w.]+)?)\]?(?:\s*[-–(]\s*(\d{4}-\d{2}-\d{2}))?/;

  // Change type headers
  const typeMap: Record<string, ChangelogEntry['changes'][0]['type']> = {
    added: 'added',
    changed: 'changed',
    deprecated: 'deprecated',
    removed: 'removed',
    fixed: 'fixed',
    security: 'security',
  };

  for (const line of lines) {
    // Check for version header
    const versionMatch = versionRegex.exec(line);
    if (versionMatch) {
      if (currentVersion) {
        versions.push(currentVersion);
      }
      currentVersion = {
        version: versionMatch[1]!,
        date: versionMatch[2],
        changes: [],
      };
      currentType = 'other';
      continue;
    }

    // Check for change type header (### Added, ### Fixed, etc.)
    if (line.startsWith('### ')) {
      const typeText = line.slice(4).toLowerCase().trim();
      currentType = typeMap[typeText] || 'other';
      continue;
    }

    // Check for change item (- or * bullet)
    const itemMatch = /^[-*]\s+(.+)/.exec(line);
    if (itemMatch && currentVersion) {
      currentVersion.changes.push({
        type: currentType,
        description: itemMatch[1]!.trim(),
      });
    }
  }

  // Push last version
  if (currentVersion) {
    versions.push(currentVersion);
  }

  return { versions };
}

/**
 * Find changelog file in package files
 * @param files - Map of file paths to content
 * @returns Changelog content or undefined
 */
export function findChangelog(files: Map<string, string>): string | undefined {
  // Common changelog file names
  const names = [
    'CHANGELOG.md',
    'changelog.md',
    'CHANGELOG',
    'changelog',
    'HISTORY.md',
    'history.md',
    'CHANGES.md',
    'changes.md',
  ];

  for (const name of names) {
    // Check with and without package/ prefix
    const content = files.get(name) || files.get(`package/${name}`);
    if (content) {
      return content;
    }
  }

  return undefined;
}

/**
 * Get latest version from changelog
 * @param changelog - Parsed changelog
 * @returns Latest version entry or undefined
 */
export function getLatestVersion(changelog: ParsedChangelog): ChangelogEntry | undefined {
  return changelog.versions[0];
}

/**
 * Get version by number
 * @param changelog - Parsed changelog
 * @param version - Version number to find
 * @returns Version entry or undefined
 */
export function getVersion(changelog: ParsedChangelog, version: string): ChangelogEntry | undefined {
  return changelog.versions.find((v) => v.version === version);
}

/**
 * Format changelog entry as text
 * @param entry - Changelog entry
 * @returns Formatted text
 */
export function formatChangelogEntry(entry: ChangelogEntry): string {
  const lines: string[] = [];

  // Header
  lines.push(`## ${entry.version}${entry.date ? ` (${entry.date})` : ''}`);
  lines.push('');

  // Group changes by type
  const grouped = new Map<string, string[]>();
  for (const change of entry.changes) {
    const existing = grouped.get(change.type) || [];
    existing.push(change.description);
    grouped.set(change.type, existing);
  }

  // Format each type
  const typeLabels: Record<string, string> = {
    added: 'Added',
    changed: 'Changed',
    deprecated: 'Deprecated',
    removed: 'Removed',
    fixed: 'Fixed',
    security: 'Security',
    other: 'Other',
  };

  for (const [type, changes] of grouped) {
    lines.push(`### ${typeLabels[type] || type}`);
    for (const change of changes) {
      lines.push(`- ${change}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Create changelog parser plugin
 * @returns Changelog parser plugin
 */
export function createChangelogParserPlugin(): Plugin {
  return definePlugin({
    name: 'changelog-parser',
    version: '1.0.0',
    category: 'parser',

    install(kernel: Kernel<ExtractorContext>) {
      // Register handler for changelog parsing
      kernel.on('parse:changelog', async (ctx: ExtractorContext) => {
        const changelogContent = findChangelog(ctx.package.files);

        if (changelogContent) {
          ctx.changelog = parseChangelog(changelogContent);
        }
      });
    },
  });
}
