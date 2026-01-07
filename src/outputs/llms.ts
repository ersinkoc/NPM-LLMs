/**
 * llms.txt output generator
 * Generates concise LLM-optimized documentation within token limits
 * @module outputs/llms
 */

import type { ExtractorContext, APIEntry, ParsedReadme } from '../types.js';
import { countTokens, truncateToTokenLimit } from '../core/tokens.js';

/**
 * Default token limit for llms.txt
 * Set to Infinity to include ALL content by default (complete documentation)
 * Users can override with --token-limit flag for size-constrained prompts
 */
export const DEFAULT_LLMS_TOKEN_LIMIT = Infinity;

/**
 * Generate options for llms.txt
 */
export interface LlmsGenerateOptions {
  /** Maximum token count (default: Infinity = no limit) */
  tokenLimit?: number;
  /** Include installation instructions */
  includeInstall?: boolean;
  /** Include quick start example */
  includeQuickStart?: boolean;
  /** Maximum functions to include (default: Infinity = all) */
  maxFunctions?: number;
  /** Maximum classes to include (default: Infinity = all) */
  maxClasses?: number;
}

/**
 * Generate llms.txt content from context
 * @param context - Extractor context
 * @param options - Generation options
 * @returns Generated llms.txt content
 * @example
 * ```typescript
 * const llmsTxt = generateLlmsTxt(context);
 * await fs.writeFile('llms.txt', llmsTxt);
 * ```
 */
export function generateLlmsTxt(
  context: ExtractorContext,
  options: LlmsGenerateOptions = {}
): string {
  const {
    tokenLimit = DEFAULT_LLMS_TOKEN_LIMIT,
    includeInstall = true,
    includeQuickStart = true,
    maxFunctions = Infinity,
    maxClasses = Infinity,
  } = options;

  const { package: pkg, api, readme } = context;
  const sections: string[] = [];

  // Header
  sections.push(`# ${pkg.name}`);
  if (pkg.description) {
    sections.push(`\n> ${pkg.description}`);
  }
  sections.push('');

  // Installation
  if (includeInstall) {
    sections.push('## Install\n');
    sections.push('```bash');
    sections.push(`npm install ${pkg.name}`);
    sections.push('```\n');
  }

  // Quick Start
  if (includeQuickStart && readme?.quickStart) {
    sections.push('## Quick Start\n');
    sections.push(readme.quickStart);
    sections.push('');
  }

  // API Summary
  sections.push('## API\n');

  // Group by kind
  const functions = api.filter((e) => e.kind === 'function');
  const classes = api.filter((e) => e.kind === 'class');
  const interfaces = api.filter((e) => e.kind === 'interface');
  const types = api.filter((e) => e.kind === 'type');
  const constants = api.filter((e) => e.kind === 'constant');

  // Functions
  if (functions.length > 0) {
    sections.push('### Functions\n');
    const limit = Math.min(functions.length, maxFunctions);
    for (let i = 0; i < limit; i++) {
      sections.push(formatFunctionBrief(functions[i]));
    }
    if (functions.length > maxFunctions && maxFunctions < Infinity) {
      sections.push(`\n...and ${functions.length - maxFunctions} more functions.`);
    }
    sections.push('');
  }

  // Classes
  if (classes.length > 0) {
    sections.push('### Classes\n');
    const limit = Math.min(classes.length, maxClasses);
    for (let i = 0; i < limit; i++) {
      sections.push(formatClassBrief(classes[i]));
    }
    if (classes.length > maxClasses && maxClasses < Infinity) {
      sections.push(`\n...and ${classes.length - maxClasses} more classes.`);
    }
    sections.push('');
  }

  // Types
  if (interfaces.length > 0 || types.length > 0) {
    sections.push('### Types\n');
    const allTypes = [...interfaces, ...types];
    for (const t of allTypes) {
      const desc = t.description ? ` - ${truncate(t.description, 80)}` : '';
      sections.push(`- \`${t.name}\`${desc}`);
    }
    sections.push('');
  }

  // Constants
  if (constants.length > 0) {
    sections.push('### Constants\n');
    for (const c of constants) {
      const desc = c.description ? ` - ${truncate(c.description, 80)}` : '';
      sections.push(`- \`${c.name}\`${desc}`);
    }
    sections.push('');
  }

  // Assemble
  let output = sections.join('\n');

  // Truncate if needed
  const currentTokens = countTokens(output);
  if (currentTokens > tokenLimit) {
    const result = truncateToTokenLimit(output, tokenLimit, ['functions', 'examples']);
    output = result.text;
    context.truncated = result.truncated;
  }

  context.tokenCount = countTokens(output);
  return output;
}

/**
 * Format a function for brief display
 */
function formatFunctionBrief(fn: APIEntry): string {
  const params = fn.params?.map((p) => `${p.name}${p.optional ? '?' : ''}`).join(', ') || '';
  const returnType = fn.returns?.type ? `: ${simplifyType(fn.returns.type)}` : '';
  const desc = fn.description ? ` - ${truncate(fn.description, 60)}` : '';

  return `- \`${fn.name}(${params})${returnType}\`${desc}`;
}

/**
 * Format a class for brief display
 */
function formatClassBrief(cls: APIEntry): string {
  const lines: string[] = [];
  const desc = cls.description ? ` - ${truncate(cls.description, 60)}` : '';
  lines.push(`- \`${cls.name}\`${desc}`);

  // Add key methods
  if (cls.methods && cls.methods.length > 0) {
    const keyMethods = cls.methods.slice(0, 3);
    for (const method of keyMethods) {
      lines.push(`  - \`${method.name}()\``);
    }
    if (cls.methods.length > 3) {
      lines.push(`  - ...${cls.methods.length - 3} more methods`);
    }
  }

  return lines.join('\n');
}

/**
 * Simplify a type for display
 */
function simplifyType(type: string): string {
  // Remove generic parameters if too complex
  if (type.length > 30) {
    const genericStart = type.indexOf('<');
    if (genericStart > 0) {
      return type.slice(0, genericStart) + '<...>';
    }
  }
  return type;
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generate minimal llms.txt for very small token limits
 * @param context - Extractor context
 * @returns Minimal llms.txt content
 */
export function generateMinimalLlmsTxt(context: ExtractorContext): string {
  const { package: pkg, api } = context;
  const lines: string[] = [];

  lines.push(`# ${pkg.name}`);
  if (pkg.description) {
    lines.push(`> ${pkg.description}`);
  }
  lines.push('');
  lines.push('```bash');
  lines.push(`npm i ${pkg.name}`);
  lines.push('```');
  lines.push('');

  // Just list top exports
  lines.push('## Exports');
  const topExports = api.slice(0, 10);
  for (const exp of topExports) {
    lines.push(`- ${exp.kind}: \`${exp.name}\``);
  }

  return lines.join('\n');
}

/**
 * Check if content fits within token limit
 * @param content - Content to check
 * @param limit - Token limit
 * @returns True if content fits
 */
export function fitsTokenLimit(content: string, limit: number): boolean {
  return countTokens(content) <= limit;
}

/**
 * Estimate token count for llms.txt
 * @param context - Extractor context
 * @returns Estimated token count
 */
export function estimateLlmsTokens(context: ExtractorContext): number {
  const { package: pkg, api, readme } = context;

  let estimate = 0;

  // Header section
  estimate += countTokens(pkg.name + (pkg.description || ''));
  estimate += 50; // Install section

  // Quick start
  if (readme?.quickStart) {
    estimate += countTokens(readme.quickStart);
  }

  // API entries (rough estimate)
  for (const entry of api) {
    estimate += 20; // Base for each entry
    if (entry.description) {
      estimate += Math.ceil(entry.description.length / 4);
    }
    if (entry.params) {
      estimate += entry.params.length * 5;
    }
  }

  return estimate;
}
