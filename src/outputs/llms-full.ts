/**
 * llms-full.txt output generator
 * Generates complete LLM-optimized documentation without token limits
 * @module outputs/llms-full
 */

import type { ExtractorContext, APIEntry, ParsedReadme } from '../types.js';
import { countTokens } from '../core/tokens.js';

/**
 * Generate options for llms-full.txt
 */
export interface LlmsFullGenerateOptions {
  /** Include full examples */
  includeExamples?: boolean;
  /** Include full parameter descriptions */
  includeParamDescriptions?: boolean;
  /** Include source file locations */
  includeSourceLocations?: boolean;
  /** Include deprecation notices */
  includeDeprecations?: boolean;
}

/**
 * Generate llms-full.txt content from context
 * @param context - Extractor context
 * @param options - Generation options
 * @returns Generated llms-full.txt content
 * @example
 * ```typescript
 * const llmsFullTxt = generateLlmsFullTxt(context);
 * await fs.writeFile('llms-full.txt', llmsFullTxt);
 * ```
 */
export function generateLlmsFullTxt(
  context: ExtractorContext,
  options: LlmsFullGenerateOptions = {}
): string {
  const {
    includeExamples = true,
    includeParamDescriptions = true,
    includeSourceLocations = false,
    includeDeprecations = true,
  } = options;

  const { package: pkg, api, readme } = context;
  const sections: string[] = [];

  // Header
  sections.push(`# ${pkg.name} v${pkg.version}`);
  if (pkg.description) {
    sections.push(`\n> ${pkg.description}`);
  }
  sections.push('');

  // Package info
  sections.push('## Package Info\n');
  sections.push(`- **Version:** ${pkg.version}`);
  if (pkg.license) {
    sections.push(`- **License:** ${pkg.license}`);
  }
  if (pkg.homepage) {
    sections.push(`- **Homepage:** ${pkg.homepage}`);
  }
  if (pkg.repository) {
    sections.push(`- **Repository:** ${pkg.repository.url}`);
  }
  sections.push('');

  // Installation
  sections.push('## Installation\n');
  sections.push('```bash');
  sections.push(`# npm`);
  sections.push(`npm install ${pkg.name}`);
  sections.push('');
  sections.push(`# yarn`);
  sections.push(`yarn add ${pkg.name}`);
  sections.push('');
  sections.push(`# pnpm`);
  sections.push(`pnpm add ${pkg.name}`);
  sections.push('```\n');

  // Quick Start
  if (readme?.quickStart) {
    sections.push('## Quick Start\n');
    sections.push(readme.quickStart);
    sections.push('');
  }

  // API Reference
  sections.push('## API Reference\n');

  // Group by kind
  const functions = api.filter((e) => e.kind === 'function');
  const classes = api.filter((e) => e.kind === 'class');
  const interfaces = api.filter((e) => e.kind === 'interface');
  const types = api.filter((e) => e.kind === 'type');
  const constants = api.filter((e) => e.kind === 'constant');
  const enums = api.filter((e) => e.kind === 'enum');

  // Functions
  if (functions.length > 0) {
    sections.push('### Functions\n');
    for (const fn of functions) {
      sections.push(formatFunction(fn, { includeExamples, includeParamDescriptions, includeDeprecations, includeSourceLocations }));
      sections.push('');
    }
  }

  // Classes
  if (classes.length > 0) {
    sections.push('### Classes\n');
    for (const cls of classes) {
      sections.push(formatClass(cls, { includeExamples, includeParamDescriptions, includeDeprecations, includeSourceLocations }));
      sections.push('');
    }
  }

  // Interfaces
  if (interfaces.length > 0) {
    sections.push('### Interfaces\n');
    for (const iface of interfaces) {
      sections.push(formatInterface(iface, { includeDeprecations, includeSourceLocations }));
      sections.push('');
    }
  }

  // Types
  if (types.length > 0) {
    sections.push('### Types\n');
    for (const type of types) {
      sections.push(formatType(type, { includeDeprecations }));
      sections.push('');
    }
  }

  // Enums
  if (enums.length > 0) {
    sections.push('### Enums\n');
    for (const enumEntry of enums) {
      sections.push(formatEnum(enumEntry));
      sections.push('');
    }
  }

  // Constants
  if (constants.length > 0) {
    sections.push('### Constants\n');
    for (const constant of constants) {
      sections.push(formatConstant(constant));
      sections.push('');
    }
  }

  const output = sections.join('\n');
  context.tokenCount = countTokens(output);
  return output;
}

/**
 * Formatting options
 */
interface FormatOptions {
  includeExamples?: boolean;
  includeParamDescriptions?: boolean;
  includeDeprecations?: boolean;
  includeSourceLocations?: boolean;
}

/**
 * Format a function entry - compact format
 */
function formatFunction(fn: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  // Compact signature line
  const params = fn.params?.map((p) => {
    const opt = p.optional ? '?' : '';
    return `${p.name}${opt}: ${compactType(p.type || 'unknown')}`;
  }).join(', ') || '';
  const returnType = fn.returns?.type ? compactType(fn.returns.type) : 'void';

  lines.push(`**${fn.name}**(${params}): ${returnType}`);

  if (options.includeDeprecations && fn.deprecated) {
    lines.push(`  ⚠️ Deprecated${typeof fn.deprecated === 'string' ? `: ${fn.deprecated}` : ''}`);
  }

  if (fn.description) {
    lines.push(`  ${truncateDesc(fn.description, 120)}`);
  }

  // Only include first example if any
  if (options.includeExamples && fn.examples && fn.examples.length > 0) {
    const example = fn.examples[0];
    const cleanExample = example.replace(/```\w*\n?/g, '').trim();
    if (cleanExample.length < 150) {
      lines.push(`  Example: \`${cleanExample.replace(/\n/g, ' ')}\``);
    }
  }

  return lines.join('\n');
}

/**
 * Format a class entry - compact format
 */
function formatClass(cls: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  // Class header
  let header = `**class ${cls.name}**`;
  if (cls.extends && cls.extends.length > 0) {
    header += ` extends ${cls.extends.join(', ')}`;
  }
  lines.push(header);

  if (options.includeDeprecations && cls.deprecated) {
    lines.push(`  ⚠️ Deprecated`);
  }

  if (cls.description) {
    lines.push(`  ${truncateDesc(cls.description, 100)}`);
  }

  // Properties - compact list
  if (cls.properties && cls.properties.length > 0) {
    const props = cls.properties.map((p) => {
      const type = p.signature.split(':').slice(1).join(':').trim() || 'unknown';
      return `${p.name}: ${compactType(type)}`;
    });
    lines.push(`  Props: ${props.join(', ')}`);
  }

  // Methods - compact list
  if (cls.methods && cls.methods.length > 0) {
    const methods = cls.methods.map((m) => {
      const ret = m.returns?.type ? compactType(m.returns.type) : 'void';
      return `${m.name}() → ${ret}`;
    });
    lines.push(`  Methods: ${methods.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Format an interface entry - compact format
 */
function formatInterface(iface: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  let header = `**interface ${iface.name}**`;
  if (iface.extends && iface.extends.length > 0) {
    header += ` extends ${iface.extends.join(', ')}`;
  }
  lines.push(header);

  if (iface.description) {
    lines.push(`  ${truncateDesc(iface.description, 100)}`);
  }

  // Properties as compact list
  if (iface.properties && iface.properties.length > 0) {
    const props = iface.properties.slice(0, 8).map((p) => {
      const sig = p.signature.replace(/;$/, '').trim();
      return sig.length < 40 ? sig : `${p.name}: ...`;
    });
    let propLine = `  { ${props.join('; ')}`;
    if (iface.properties.length > 8) {
      propLine += `; +${iface.properties.length - 8} more`;
    }
    propLine += ' }';
    lines.push(propLine);
  }

  return lines.join('\n');
}

/**
 * Format a type entry - compact format
 */
function formatType(type: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  // Compact type definition
  const compactSig = type.signature
    .replace(/^type\s+\w+\s*=\s*/, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  lines.push(`**type ${type.name}** = ${compactSig.length > 100 ? compactSig.slice(0, 97) + '...' : compactSig}`);

  if (options.includeDeprecations && type.deprecated) {
    lines.push(`  ⚠️ Deprecated`);
  }

  if (type.description) {
    lines.push(`  ${truncateDesc(type.description, 100)}`);
  }

  return lines.join('\n');
}

/**
 * Format an enum entry - compact format
 */
function formatEnum(enumEntry: APIEntry): string {
  const lines: string[] = [];

  // Compact: enum NAME { A, B, C } or enum NAME { A=1, B=2 }
  const members = enumEntry.members?.map((m) => {
    if (m.value !== undefined) {
      return `${m.name}=${typeof m.value === 'string' ? `"${m.value}"` : m.value}`;
    }
    return m.name;
  }) || [];

  const memberStr = members.join(', ');
  const compactMembers = memberStr.length > 80 ? memberStr.slice(0, 77) + '...' : memberStr;

  lines.push(`**enum ${enumEntry.name}** { ${compactMembers} }`);

  if (enumEntry.description) {
    lines.push(`  ${truncateDesc(enumEntry.description, 100)}`);
  }

  return lines.join('\n');
}

/**
 * Format a constant entry - compact format
 */
function formatConstant(constant: APIEntry): string {
  const lines: string[] = [];

  // Compact: const NAME: TYPE = VALUE
  lines.push(`**${constant.name}**: ${compactType(constant.signature.replace(/^(const|let|var)\s+\w+\s*[=:]\s*/, ''))}`);

  if (constant.description) {
    lines.push(`  ${truncateDesc(constant.description, 100)}`);
  }

  return lines.join('\n');
}

/**
 * Compact a type string by removing newlines and extra whitespace
 */
function compactType(type: string): string {
  const compact = type
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*([{}<>,;:|&])\s*/g, '$1')
    .trim();
  if (compact.length <= 60) return compact;
  return compact.slice(0, 57) + '...';
}

/**
 * Truncate description to max length
 */
function truncateDesc(desc: string, maxLen: number): string {
  const oneLine = desc.replace(/\s*\n\s*/g, ' ').trim();
  if (oneLine.length <= maxLen) return oneLine;
  return oneLine.slice(0, maxLen - 3) + '...';
}
