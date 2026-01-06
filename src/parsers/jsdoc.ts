/**
 * JSDoc comment parser
 * Extracts structured documentation from JSDoc comments
 * @module parsers/jsdoc
 */

import type { JSDocParsed } from '../types.js';

/**
 * JSDoc tag patterns
 */
const TAG_PATTERNS = {
  /** @param {type} name - description */
  param: /@param\s+(?:\{([^}]*)\})?\s*(\[?\w+(?:\.\w+)*\]?)\s*(?:-\s*)?(.*)$/gm,

  /** @returns {type} description */
  returns: /@returns?\s+(?:\{([^}]*)\})?\s*(.*)/g,

  /** @example ... */
  example: /@example\s*([\s\S]*?)(?=@\w|$)/g,

  /** @deprecated reason */
  deprecated: /@deprecated\s*(.*)/g,

  /** @since version */
  since: /@since\s*(.*)/g,

  /** @see reference */
  see: /@see\s*(.*)/g,

  /** @throws {type} description */
  throws: /@throws?\s+(?:\{([^}]*)\})?\s*(.*)/g,

  /** @template T - description */
  typeParam: /@template\s+(\w+)\s*(?:-\s*)?(.*)/g,

  /** @type {type} */
  type: /@type\s+\{([^}]*)\}/g,

  /** @typedef {type} name */
  typedef: /@typedef\s+\{([^}]*)\}\s*(\w+)/g,

  /** @default value */
  default: /@default\s+(.*)/g,
};

/**
 * Clean JSDoc comment by removing comment markers
 * @param comment - Raw JSDoc comment (including markers)
 * @returns Cleaned content
 */
export function cleanJSDocComment(comment: string): string {
  return comment
    .replace(/^\/\*\*\s*/, '') // Remove opening /**
    .replace(/\s*\*\/$/, '') // Remove closing */
    .replace(/^\s*\*\s?/gm, '') // Remove leading * on each line
    .trim();
}

/**
 * Extract description from JSDoc content
 * Description is text before first @tag
 * @param content - Cleaned JSDoc content
 * @returns Description text
 */
export function extractDescription(content: string): string | undefined {
  // Find first @tag
  const tagMatch = content.match(/@\w+/);
  if (!tagMatch) {
    return content.trim() || undefined;
  }

  const description = content.slice(0, tagMatch.index).trim();
  return description || undefined;
}

/**
 * Parse a single @param tag
 */
interface ParsedParam {
  name: string;
  type?: string;
  description?: string;
  optional: boolean;
  defaultValue?: string;
}

/**
 * Parse @param tags
 * @param content - JSDoc content
 * @returns Array of parsed params
 */
export function parseParams(content: string): ParsedParam[] {
  const params: ParsedParam[] = [];
  const pattern = new RegExp(TAG_PATTERNS.param.source, 'gm');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const [, type, rawName, description] = match;
    if (!rawName) continue;

    const name = rawName;
    // Check if optional (wrapped in [])
    const isOptional = name.startsWith('[') && name.endsWith(']');
    let cleanName = isOptional ? name.slice(1, -1) : name;
    let defaultValue: string | undefined;

    // Check for default value: [name=default]
    const eqIndex = cleanName.indexOf('=');
    if (eqIndex > 0) {
      defaultValue = cleanName.slice(eqIndex + 1);
      cleanName = cleanName.slice(0, eqIndex);
    }

    params.push({
      name: cleanName,
      type: type?.trim(),
      description: description?.trim() || undefined,
      optional: isOptional,
      defaultValue,
    });
  }

  return params;
}

/**
 * Parse @returns tag
 * @param content - JSDoc content
 * @returns Parsed return info
 */
export function parseReturns(
  content: string
): { type?: string; description?: string } | undefined {
  const pattern = new RegExp(TAG_PATTERNS.returns.source, 'g');
  const match = pattern.exec(content);

  if (!match) return undefined;

  const [, type, description] = match;
  return {
    type: type?.trim(),
    description: description?.trim() || undefined,
  };
}

/**
 * Parse @example tags
 * @param content - JSDoc content
 * @returns Array of examples
 */
export function parseExamples(content: string): string[] {
  const examples: string[] = [];
  const pattern = new RegExp(TAG_PATTERNS.example.source, 'g');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const example = match[1]?.trim();
    if (example) {
      examples.push(example);
    }
  }

  return examples;
}

/**
 * Parse @deprecated tag
 * @param content - JSDoc content
 * @returns Deprecation message or undefined
 */
export function parseDeprecated(content: string): string | undefined {
  const pattern = new RegExp(TAG_PATTERNS.deprecated.source, 'g');
  const match = pattern.exec(content);
  return match ? (match[1]?.trim() || 'true') : undefined;
}

/**
 * Parse @since tag
 * @param content - JSDoc content
 * @returns Version string or undefined
 */
export function parseSince(content: string): string | undefined {
  const pattern = new RegExp(TAG_PATTERNS.since.source, 'g');
  const match = pattern.exec(content);
  return match ? match[1]?.trim() : undefined;
}

/**
 * Parse @see tags
 * @param content - JSDoc content
 * @returns Array of references
 */
export function parseSee(content: string): string[] {
  const refs: string[] = [];
  const pattern = new RegExp(TAG_PATTERNS.see.source, 'g');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const ref = match[1]?.trim();
    if (ref) {
      refs.push(ref);
    }
  }

  return refs;
}

/**
 * Parse @throws tags
 * @param content - JSDoc content
 * @returns Array of throw info
 */
export function parseThrows(content: string): Array<{ type?: string; description?: string }> {
  const throws: Array<{ type?: string; description?: string }> = [];
  const pattern = new RegExp(TAG_PATTERNS.throws.source, 'g');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const [, type, description] = match;
    throws.push({
      type: type?.trim(),
      description: description?.trim() || undefined,
    });
  }

  return throws;
}

/**
 * Parse @template tags (type parameters)
 * @param content - JSDoc content
 * @returns Array of type param info
 */
export function parseTypeParams(content: string): Array<{ name: string; description?: string }> {
  const params: Array<{ name: string; description?: string }> = [];
  const pattern = new RegExp(TAG_PATTERNS.typeParam.source, 'g');

  let match;
  while ((match = pattern.exec(content)) !== null) {
    const [, name, description] = match;
    if (!name) continue;
    params.push({
      name: name.trim(),
      description: description?.trim() || undefined,
    });
  }

  return params;
}

/**
 * Parse a complete JSDoc comment
 * @param comment - Raw JSDoc comment (with /** ... *\/)
 * @returns Parsed JSDoc object
 * @example
 * ```typescript
 * const parsed = parseJSDoc(`/**
 *  * Adds two numbers.
 *  * @param a - First number
 *  * @param b - Second number
 *  * @returns The sum
 *  * @example add(1, 2) // 3
 *  *\/`);
 * console.log(parsed.description); // "Adds two numbers."
 * console.log(parsed.params[0].name); // "a"
 * ```
 */
export function parseJSDoc(comment: string): JSDocParsed {
  const content = cleanJSDocComment(comment);

  return {
    description: extractDescription(content),
    params: parseParams(content).map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
      optional: p.optional,
      defaultValue: p.defaultValue,
    })),
    returns: parseReturns(content),
    examples: parseExamples(content),
    deprecated: parseDeprecated(content),
    since: parseSince(content),
    see: parseSee(content),
    throws: parseThrows(content),
    typeParams: parseTypeParams(content),
  };
}

/**
 * Extract all JSDoc comments from source code
 * @param source - TypeScript/JavaScript source code
 * @returns Array of JSDoc comments with positions
 */
export function extractJSDocComments(
  source: string
): Array<{ comment: string; start: number; end: number }> {
  const comments: Array<{ comment: string; start: number; end: number }> = [];
  const pattern = /\/\*\*[\s\S]*?\*\//g;

  let match;
  while ((match = pattern.exec(source)) !== null) {
    comments.push({
      comment: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return comments;
}

/**
 * Find the JSDoc comment immediately before a position
 * @param source - Source code
 * @param position - Position to search before
 * @param comments - Pre-extracted comments
 * @returns JSDoc comment if found
 */
export function findPrecedingJSDoc(
  source: string,
  position: number,
  comments?: Array<{ comment: string; start: number; end: number }>
): JSDocParsed | undefined {
  const allComments = comments ?? extractJSDocComments(source);

  // Find comment that ends just before position (with only whitespace between)
  for (let i = allComments.length - 1; i >= 0; i--) {
    const comment = allComments[i];
    if (!comment || comment.end > position) continue;

    // Check if only whitespace between comment end and position
    const between = source.slice(comment.end, position);
    if (/^\s*$/.test(between)) {
      return parseJSDoc(comment.comment);
    }

    // Comments are sorted by position, so stop searching
    if (comment.end < position - 500) break;
  }

  return undefined;
}

/**
 * Check if a comment is a JSDoc comment
 * @param comment - Comment text
 * @returns True if JSDoc format
 */
export function isJSDocComment(comment: string): boolean {
  return comment.startsWith('/**') && !comment.startsWith('/***');
}

/**
 * Merge JSDoc from multiple sources
 * @param sources - Array of JSDoc objects to merge
 * @returns Merged JSDoc
 */
export function mergeJSDoc(...sources: (JSDocParsed | undefined)[]): JSDocParsed {
  const result: JSDocParsed = {
    params: [],
    examples: [],
    see: [],
    throws: [],
    typeParams: [],
  };

  for (const source of sources) {
    if (!source) continue;

    // Use first non-empty description
    if (!result.description && source.description) {
      result.description = source.description;
    }

    // Merge params (by name, later wins)
    for (const param of source.params) {
      const existing = result.params.findIndex((p) => p.name === param.name);
      if (existing >= 0) {
        result.params[existing] = param;
      } else {
        result.params.push(param);
      }
    }

    // Use first returns
    if (!result.returns && source.returns) {
      result.returns = source.returns;
    }

    // Collect all unique examples
    for (const example of source.examples) {
      if (!result.examples.includes(example)) {
        result.examples.push(example);
      }
    }

    // Use first deprecated
    if (!result.deprecated && source.deprecated) {
      result.deprecated = source.deprecated;
    }

    // Use first since
    if (!result.since && source.since) {
      result.since = source.since;
    }

    // Collect all unique see refs
    for (const ref of source.see) {
      if (!result.see.includes(ref)) {
        result.see.push(ref);
      }
    }

    // Collect all throws
    result.throws.push(...source.throws);

    // Collect all type params
    for (const tp of source.typeParams) {
      const existing = result.typeParams.findIndex((p) => p.name === tp.name);
      if (existing >= 0) {
        result.typeParams[existing] = tp;
      } else {
        result.typeParams.push(tp);
      }
    }
  }

  return result;
}
