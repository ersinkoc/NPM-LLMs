/**
 * llms.txt output generator
 * Generates concise LLM-optimized documentation within token limits
 * @module outputs/llms
 */

import type { ExtractorContext, APIEntry, ParsedReadme } from '../types.js';
import { countTokens, truncateToTokenLimit } from '../core/tokens.js';

/**
 * Default token limit for llms.txt
 */
export const DEFAULT_LLMS_TOKEN_LIMIT = 2000;

/**
 * Generate options for llms.txt
 */
export interface LlmsGenerateOptions {
  /** Maximum token count */
  tokenLimit?: number;
  /** Include installation instructions */
  includeInstall?: boolean;
  /** Include quick start example */
  includeQuickStart?: boolean;
  /** Maximum functions to include */
  maxFunctions?: number;
  /** Maximum classes to include */
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
    maxFunctions = 15,
    maxClasses = 5,
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
    const toInclude = functions.slice(0, maxFunctions);
    for (const fn of toInclude) {
      sections.push(formatFunctionBrief(fn));
    }
    if (functions.length > maxFunctions) {
      sections.push(`\n...and ${functions.length - maxFunctions} more functions.`);
    }
    sections.push('');
  }

  // Classes
  if (classes.length > 0) {
    sections.push('### Classes\n');
    const toInclude = classes.slice(0, maxClasses);
    for (const cls of toInclude) {
      sections.push(formatClassBrief(cls));
    }
    if (classes.length > maxClasses) {
      sections.push(`\n...and ${classes.length - maxClasses} more classes.`);
    }
    sections.push('');
  }

  // Types (brief)
  if (interfaces.length > 0 || types.length > 0) {
    sections.push('### Types\n');
    const allTypes = [...interfaces, ...types].slice(0, 10);
    for (const t of allTypes) {
      const desc = t.description ? ` - ${truncate(t.description, 50)}` : '';
      sections.push(`- \`${t.name}\`${desc}`);
    }
    const totalTypes = interfaces.length + types.length;
    if (totalTypes > 10) {
      sections.push(`\n...and ${totalTypes - 10} more types.`);
    }
    sections.push('');
  }

  // Constants (brief)
  if (constants.length > 0 && constants.length <= 10) {
    sections.push('### Constants\n');
    for (const c of constants.slice(0, 5)) {
      const desc = c.description ? ` - ${truncate(c.description, 50)}` : '';
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
