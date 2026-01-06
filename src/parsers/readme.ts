/**
 * README.md parser
 * Extracts structured content from package README files
 * @module parsers/readme
 */

import type { ParsedReadme } from '../types.js';

/**
 * Common section headings for matching
 */
const SECTION_PATTERNS = {
  installation: /^#+\s*(installation|install|setup|getting started)/i,
  quickStart: /^#+\s*(quick\s*start|usage|getting\s*started|basic\s*usage)/i,
  api: /^#+\s*(api|api\s*reference|reference|methods|functions)/i,
  examples: /^#+\s*(examples?|code\s*examples?)/i,
  features: /^#+\s*(features?|highlights)/i,
  requirements: /^#+\s*(requirements?|prerequisites?|dependencies)/i,
  contributing: /^#+\s*(contributing|contribution)/i,
  license: /^#+\s*(license|licensing)/i,
  changelog: /^#+\s*(changelog|changes|version\s*history)/i,
};

/**
 * Badge pattern matcher
 */
const BADGE_PATTERN =
  /\[!\[([^\]]*)\]\(([^)]+)\)\]\([^)]+\)|\!\[([^\]]*)\]\(([^)]+)\)/g;

/**
 * Code block pattern
 */
const CODE_BLOCK_PATTERN = /```(\w+)?\s*\n([\s\S]*?)```/g;

/**
 * Parse a README.md file
 * @param content - README content
 * @returns Parsed README structure
 * @example
 * ```typescript
 * const readme = parseReadme(readmeContent);
 * console.log(readme.title);
 * console.log(readme.installation);
 * ```
 */
export function parseReadme(content: string): ParsedReadme {
  const sections = extractSections(content);
  const badges = extractBadges(content);
  const { title, description } = extractTitleAndDescription(content, sections);

  // Find specific sections
  const installation = findSection(sections, SECTION_PATTERNS.installation);
  const quickStart = findSection(sections, SECTION_PATTERNS.quickStart);
  const api = findSection(sections, SECTION_PATTERNS.api);
  const examples = findExampleSections(sections);

  return {
    title,
    description,
    badges,
    installation: installation?.content,
    quickStart: quickStart?.content || findQuickStartFromCode(content),
    examples,
    api: api?.content,
    sections,
  };
}

/**
 * Section with title and content
 */
interface Section {
  title: string;
  content: string;
  level: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Extract all sections from README
 * @param content - README content
 * @returns Array of sections
 */
export function extractSections(content: string): Section[] {
  const sections: Section[] = [];
  const lines = content.split('\n');

  let currentSection: Section | null = null;
  let currentContent: string[] = [];
  let lineIndex = 0;
  let charIndex = 0;

  function finishSection(): void {
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.endIndex = charIndex;
      sections.push(currentSection);
      currentContent = [];
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch && headingMatch[1] && headingMatch[2]) {
      finishSection();

      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      currentSection = {
        title,
        content: '',
        level,
        startIndex: charIndex,
        endIndex: 0,
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }

    charIndex += line.length + 1; // +1 for newline
    lineIndex++;
  }

  finishSection();

  return sections;
}

/**
 * Find a section matching a pattern
 */
function findSection(sections: Section[], pattern: RegExp): Section | undefined {
  return sections.find((s) => pattern.test(`# ${s.title}`));
}

/**
 * Find example sections
 */
function findExampleSections(sections: Section[]): string[] {
  const examples: string[] = [];

  for (const section of sections) {
    if (SECTION_PATTERNS.examples.test(`# ${section.title}`)) {
      // Extract code blocks from examples section
      const codeBlocks = extractCodeBlocks(section.content);
      examples.push(...codeBlocks);
    }
  }

  return examples;
}

/**
 * Extract code blocks from content
 * @param content - Content to extract from
 * @returns Array of code block contents
 */
export function extractCodeBlocks(content: string): string[] {
  const blocks: string[] = [];
  const pattern = new RegExp(CODE_BLOCK_PATTERN.source, 'g');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const [, language, code] = match;
    if (code && code.trim()) {
      // Include language for context
      blocks.push(language ? `\`\`\`${language}\n${code.trim()}\n\`\`\`` : code.trim());
    }
  }

  return blocks;
}

/**
 * Extract badges from README
 */
function extractBadges(content: string): string[] {
  const badges: string[] = [];
  const pattern = new RegExp(BADGE_PATTERN.source, 'g');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    // Get alt text
    const altText = match[1] || match[3] || '';
    if (altText) {
      badges.push(altText);
    }
  }

  return badges;
}

/**
 * Extract title and description from README
 */
function extractTitleAndDescription(
  content: string,
  sections: Section[]
): { title?: string; description?: string } {
  let title: string | undefined;
  let description: string | undefined;

  // Title is usually first heading or first line
  const firstHeading = sections[0];
  if (firstHeading?.level === 1) {
    title = firstHeading.title;
  } else {
    // Look for first line that's not a badge
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (trimmed.startsWith('!') || trimmed.startsWith('[!')) continue;
      if (trimmed.startsWith('#')) {
        title = trimmed.replace(/^#+\s*/, '');
        break;
      }
    }
  }

  // Description is usually first paragraph after title
  const afterTitle = content.split('\n').slice(1);
  let foundContent = false;

  for (const line of afterTitle) {
    const trimmed = line.trim();

    // Skip badges
    if (trimmed.startsWith('!') || trimmed.startsWith('[!')) continue;
    // Skip headings
    if (trimmed.startsWith('#')) break;
    // Skip empty lines before content
    if (!trimmed && !foundContent) continue;
    // End on empty line after content
    if (!trimmed && foundContent) break;

    if (trimmed) {
      foundContent = true;
      if (!description) {
        description = trimmed;
      } else {
        description += ' ' + trimmed;
      }
    }
  }

  // Clean up description - remove markdown formatting
  if (description) {
    description = description
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/`([^`]+)`/g, '$1') // Remove inline code
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .trim();
  }

  return { title, description };
}

/**
 * Find quick start code from first code blocks
 */
function findQuickStartFromCode(content: string): string | undefined {
  // Look for code block in first 1000 chars or after installation
  const installMatch = content.match(/installation|install|setup/i);
  const startIndex = installMatch?.index ?? 0;

  const searchArea = content.slice(startIndex, startIndex + 2000);
  const codeBlocks = extractCodeBlocks(searchArea);

  // Find first JS/TS code block
  for (const block of codeBlocks) {
    if (
      block.startsWith('```javascript') ||
      block.startsWith('```typescript') ||
      block.startsWith('```js') ||
      block.startsWith('```ts') ||
      block.startsWith('```jsx') ||
      block.startsWith('```tsx')
    ) {
      return block;
    }
  }

  // Fall back to any code block
  return codeBlocks[0];
}

/**
 * Extract installation command from content
 * @param content - README content or installation section
 * @returns Installation command or undefined
 */
export function extractInstallCommand(content: string): string | undefined {
  // Look for npm/yarn/pnpm install commands
  const patterns = [
    /npm\s+(?:install|i)\s+(?:-[gDPS]\s+)?(\S+)/,
    /yarn\s+add\s+(?:-[gDPS]\s+)?(\S+)/,
    /pnpm\s+(?:add|install)\s+(?:-[gDPS]\s+)?(\S+)/,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[0];
    }
  }

  // Look in code blocks
  const codeBlocks = extractCodeBlocks(content);
  for (const block of codeBlocks) {
    if (block.includes('npm install') || block.includes('yarn add') || block.includes('pnpm add')) {
      // Extract the command line
      const lines = block.split('\n');
      for (const line of lines) {
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            return line.trim();
          }
        }
      }
    }
  }

  return undefined;
}

/**
 * Clean markdown formatting from text
 * @param text - Text with markdown
 * @returns Plain text
 */
export function cleanMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Images
    .replace(/`{1,3}[^`]*`{1,3}/g, '') // Code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/__([^_]+)__/g, '$1') // Bold underscore
    .replace(/_([^_]+)_/g, '$1') // Italic underscore
    .replace(/~~([^~]+)~~/g, '$1') // Strikethrough
    .replace(/^#+\s*/gm, '') // Headings
    .replace(/^>\s*/gm, '') // Blockquotes
    .replace(/^[-*+]\s+/gm, '') // Lists
    .replace(/^\d+\.\s+/gm, '') // Numbered lists
    .trim();
}

/**
 * Truncate README content intelligently
 * @param readme - Parsed README
 * @param maxLength - Maximum length in characters
 * @returns Truncated README
 */
export function truncateReadme(readme: ParsedReadme, maxLength: number): ParsedReadme {
  const result = { ...readme };
  let currentLength = 0;

  // Priority order for keeping content
  const priorities: Array<keyof ParsedReadme> = [
    'title',
    'description',
    'installation',
    'quickStart',
    'api',
    'examples',
  ];

  // Calculate total
  for (const key of priorities) {
    const value = result[key];
    if (typeof value === 'string') {
      currentLength += value.length;
    } else if (Array.isArray(value)) {
      currentLength += value.join('').length;
    }
  }

  if (currentLength <= maxLength) {
    return result;
  }

  // Truncate lower priority items first
  const lowPriority: Array<keyof ParsedReadme> = ['examples', 'api', 'sections'];

  for (const key of lowPriority) {
    if (currentLength <= maxLength) break;

    const value = result[key];
    if (Array.isArray(value)) {
      const saved = value.join('').length;
      (result as Record<string, unknown>)[key] = [];
      currentLength -= saved;
    } else if (typeof value === 'string') {
      const saved = value.length;
      (result as Record<string, unknown>)[key] = undefined;
      currentLength -= saved;
    }
  }

  return result;
}
