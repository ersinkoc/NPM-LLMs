/**
 * Token counting and truncation utilities
 * Approximates GPT-4/Claude tokenization for content budgeting
 * @module core/tokens
 */

import type { ContentPriority } from '../types.js';

/**
 * Section of content with metadata
 */
export interface ContentSection {
  /** Section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Section content */
  content: string;
  /** Section priority type */
  priority: ContentPriority;
  /** Estimated token count */
  tokens: number;
}

/**
 * Average characters per token for different content types
 * Based on empirical analysis of GPT-4/Claude tokenization
 */
const CHARS_PER_TOKEN = {
  /** English prose: ~4 chars per token */
  prose: 4,
  /** Code blocks: ~3 chars per token (more special tokens) */
  code: 3,
  /** Markdown: ~3.5 chars per token */
  markdown: 3.5,
};

/**
 * Priority order for content truncation (higher = more important)
 */
const PRIORITY_ORDER: Record<ContentPriority, number> = {
  functions: 100,
  examples: 90,
  classes: 80,
  interfaces: 70,
  types: 60,
  readme: 50,
};

/**
 * Count approximate tokens in text
 * Uses character-based heuristic optimized for LLM tokenization
 * @param text - Text to count tokens in
 * @returns Approximate token count
 * @example
 * ```typescript
 * const tokens = countTokens("Hello, world!");
 * console.log(tokens); // ~4
 * ```
 */
export function countTokens(text: string): number {
  if (!text) return 0;

  let tokens = 0;

  // Split by code blocks to handle them separately
  const codeBlockRegex = /```[\s\S]*?```/g;
  const parts: Array<{ text: string; isCode: boolean }> = [];

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add prose before code block
    if (match.index > lastIndex) {
      parts.push({
        text: text.slice(lastIndex, match.index),
        isCode: false,
      });
    }
    // Add code block
    parts.push({
      text: match[0],
      isCode: true,
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining prose
  if (lastIndex < text.length) {
    parts.push({
      text: text.slice(lastIndex),
      isCode: false,
    });
  }

  // Count tokens for each part
  for (const part of parts) {
    const charsPerToken = part.isCode ? CHARS_PER_TOKEN.code : CHARS_PER_TOKEN.prose;
    tokens += Math.ceil(part.text.length / charsPerToken);
  }

  return tokens;
}

/**
 * Count tokens in a code string (no code block detection)
 * @param code - Code to count
 * @returns Approximate token count
 */
export function countCodeTokens(code: string): number {
  if (!code) return 0;
  return Math.ceil(code.length / CHARS_PER_TOKEN.code);
}

/**
 * Count tokens in markdown content
 * @param markdown - Markdown content
 * @returns Approximate token count
 */
export function countMarkdownTokens(markdown: string): number {
  if (!markdown) return 0;

  // Simple heuristic: code blocks use code ratio, rest uses markdown ratio
  let codeTokens = 0;
  let textTokens = 0;

  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    // Text before code block
    if (match.index > lastIndex) {
      const textPart = markdown.slice(lastIndex, match.index);
      textTokens += Math.ceil(textPart.length / CHARS_PER_TOKEN.markdown);
    }
    // Code block
    codeTokens += Math.ceil(match[0].length / CHARS_PER_TOKEN.code);
    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < markdown.length) {
    const remaining = markdown.slice(lastIndex);
    textTokens += Math.ceil(remaining.length / CHARS_PER_TOKEN.markdown);
  }

  return codeTokens + textTokens;
}

/**
 * Estimate if text will fit within token limit
 * @param text - Text to check
 * @param limit - Token limit
 * @returns True if text fits within limit
 */
export function fitsTokenLimit(text: string, limit: number): boolean {
  return countTokens(text) <= limit;
}

/**
 * Parse content into sections
 * @param text - Markdown text to parse
 * @returns Array of sections
 */
export function parseSections(text: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = text.split('\n');

  let currentSection: ContentSection | null = null;
  let currentContent: string[] = [];

  function finishSection(): void {
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      currentSection.tokens = countTokens(currentSection.content);
      sections.push(currentSection);
      currentContent = [];
    }
  }

  for (const line of lines) {
    // Check for heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch && headingMatch[2]) {
      finishSection();

      const title = headingMatch[2].trim();
      const priority = inferPriority(title);

      currentSection = {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        title,
        content: '',
        priority,
        tokens: 0,
      };
      currentContent = [line];
    } else if (currentSection) {
      currentContent.push(line);
    } else {
      // Content before first heading - treat as intro
      if (line.trim()) {
        if (!currentSection) {
          currentSection = {
            id: 'intro',
            title: 'Introduction',
            content: '',
            priority: 'readme',
            tokens: 0,
          };
        }
        currentContent.push(line);
      }
    }
  }

  finishSection();

  return sections;
}

/**
 * Infer content priority from section title
 */
function inferPriority(title: string): ContentPriority {
  const lower = title.toLowerCase();

  if (lower.includes('function') || lower.includes('method') || lower.includes('api')) {
    return 'functions';
  }
  if (lower.includes('example') || lower.includes('usage') || lower.includes('quick start')) {
    return 'examples';
  }
  if (lower.includes('class')) {
    return 'classes';
  }
  if (lower.includes('interface')) {
    return 'interfaces';
  }
  if (lower.includes('type')) {
    return 'types';
  }

  return 'readme';
}

/**
 * Sort sections by priority
 * @param sections - Sections to sort
 * @param priorities - Priority order (first = highest)
 * @returns Sorted sections
 */
export function prioritizeSections(
  sections: ContentSection[],
  priorities: ContentPriority[] = ['functions', 'examples']
): ContentSection[] {
  // Build custom priority map
  const customOrder: Record<ContentPriority, number> = { ...PRIORITY_ORDER };

  // Boost specified priorities
  priorities.forEach((p, i) => {
    customOrder[p] = 1000 - i;
  });

  return [...sections].sort((a, b) => {
    return (customOrder[b.priority] ?? 0) - (customOrder[a.priority] ?? 0);
  });
}

/**
 * Truncation result
 */
export interface TruncateResult {
  /** Truncated text */
  text: string;
  /** Whether truncation occurred */
  truncated: boolean;
  /** Actual token count */
  tokenCount: number;
  /** Sections included */
  includedSections: string[];
  /** Sections removed */
  removedSections: string[];
}

/**
 * Truncate text to fit within token limit while preserving structure
 * @param text - Text to truncate
 * @param limit - Token limit
 * @param priorities - Priority order for content
 * @returns Truncated text and metadata
 * @example
 * ```typescript
 * const result = truncateToTokenLimit(content, 2000);
 * if (result.truncated) {
 *   console.log(`Removed: ${result.removedSections.join(', ')}`);
 * }
 * ```
 */
export function truncateToTokenLimit(
  text: string,
  limit: number,
  priorities: ContentPriority[] = ['functions', 'examples']
): TruncateResult {
  const currentTokens = countTokens(text);

  // No truncation needed
  if (currentTokens <= limit) {
    return {
      text,
      truncated: false,
      tokenCount: currentTokens,
      includedSections: [],
      removedSections: [],
    };
  }

  // Parse and prioritize sections
  const sections = parseSections(text);
  const prioritized = prioritizeSections(sections, priorities);

  // Build output within limit
  const included: ContentSection[] = [];
  const removed: ContentSection[] = [];
  let usedTokens = 0;

  for (const section of prioritized) {
    if (usedTokens + section.tokens <= limit) {
      included.push(section);
      usedTokens += section.tokens;
    } else {
      // Try to include partial section
      const remaining = limit - usedTokens;
      if (remaining > 50 && section.tokens > 0) {
        // Truncate section content
        const truncated = truncateSectionContent(section, remaining);
        if (truncated) {
          included.push(truncated);
          usedTokens += truncated.tokens;
        }
      }
      removed.push(section);
    }
  }

  // Reconstruct text in original order
  const sectionOrder = sections.map((s) => s.id);
  included.sort((a, b) => sectionOrder.indexOf(a.id) - sectionOrder.indexOf(b.id));

  const output = included.map((s) => s.content).join('\n\n');

  return {
    text: output.trim(),
    truncated: true,
    tokenCount: countTokens(output),
    includedSections: included.map((s) => s.title),
    removedSections: removed.map((s) => s.title),
  };
}

/**
 * Truncate a single section's content to fit token limit
 */
function truncateSectionContent(
  section: ContentSection,
  maxTokens: number
): ContentSection | null {
  const lines = section.content.split('\n');
  const truncatedLines: string[] = [];
  let tokens = 0;

  for (const line of lines) {
    const lineTokens = countTokens(line);
    if (tokens + lineTokens <= maxTokens) {
      truncatedLines.push(line);
      tokens += lineTokens;
    } else {
      break;
    }
  }

  if (truncatedLines.length === 0) {
    return null;
  }

  // Add truncation indicator
  truncatedLines.push('\n...(truncated)');

  return {
    ...section,
    content: truncatedLines.join('\n'),
    tokens: countTokens(truncatedLines.join('\n')),
  };
}

/**
 * Format token count for display
 * @param tokens - Token count
 * @returns Formatted string
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  }
  return `${(tokens / 1000).toFixed(1)}k tokens`;
}

/**
 * Calculate token usage percentage
 * @param used - Tokens used
 * @param limit - Token limit
 * @returns Percentage (0-100)
 */
export function tokenUsagePercent(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}
