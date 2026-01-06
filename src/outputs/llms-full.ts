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
 * Format a function entry
 */
function formatFunction(fn: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  // Name and signature
  lines.push(`#### \`${fn.name}\``);

  if (options.includeDeprecations && fn.deprecated) {
    lines.push(`\n> ⚠️ **Deprecated:** ${typeof fn.deprecated === 'string' ? fn.deprecated : 'This function is deprecated.'}`);
  }

  if (fn.description) {
    lines.push(`\n${fn.description}`);
  }

  // Signature
  lines.push('\n**Signature:**');
  lines.push('```typescript');
  lines.push(fn.signature);
  lines.push('```');

  // Parameters
  if (fn.params && fn.params.length > 0 && options.includeParamDescriptions) {
    lines.push('\n**Parameters:**\n');
    for (const param of fn.params) {
      const optional = param.optional ? ' (optional)' : '';
      const defaultVal = param.defaultValue ? ` = \`${param.defaultValue}\`` : '';
      lines.push(`- \`${param.name}: ${param.type || 'unknown'}\`${optional}${defaultVal}`);
      if (param.description) {
        lines.push(`  - ${param.description}`);
      }
    }
  }

  // Returns
  if (fn.returns) {
    lines.push('\n**Returns:**');
    lines.push(`- \`${fn.returns.type}\`${fn.returns.description ? ` - ${fn.returns.description}` : ''}`);
  }

  // Examples
  if (options.includeExamples && fn.examples && fn.examples.length > 0) {
    lines.push('\n**Examples:**');
    for (const example of fn.examples) {
      if (example.includes('```')) {
        lines.push(example);
      } else {
        lines.push('```typescript');
        lines.push(example);
        lines.push('```');
      }
    }
  }

  // Source location
  if (options.includeSourceLocations && fn.sourceFile) {
    lines.push(`\n*Source: ${fn.sourceFile}${fn.line ? `:${fn.line}` : ''}*`);
  }

  return lines.join('\n');
}

/**
 * Format a class entry
 */
function formatClass(cls: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  // Name
  lines.push(`#### \`${cls.name}\``);

  if (options.includeDeprecations && cls.deprecated) {
    lines.push(`\n> ⚠️ **Deprecated:** ${typeof cls.deprecated === 'string' ? cls.deprecated : 'This class is deprecated.'}`);
  }

  if (cls.description) {
    lines.push(`\n${cls.description}`);
  }

  // Signature
  lines.push('\n**Signature:**');
  lines.push('```typescript');
  let sig = cls.signature;
  if (cls.extends && cls.extends.length > 0) {
    sig += ` extends ${cls.extends.join(', ')}`;
  }
  if (cls.implements && cls.implements.length > 0) {
    sig += ` implements ${cls.implements.join(', ')}`;
  }
  lines.push(sig);
  lines.push('```');

  // Properties
  if (cls.properties && cls.properties.length > 0) {
    lines.push('\n**Properties:**\n');
    for (const prop of cls.properties) {
      lines.push(`- \`${prop.name}\`: \`${prop.signature.split(':').slice(1).join(':').trim() || 'unknown'}\``);
      if (prop.description) {
        lines.push(`  - ${prop.description}`);
      }
    }
  }

  // Methods
  if (cls.methods && cls.methods.length > 0) {
    lines.push('\n**Methods:**\n');
    for (const method of cls.methods) {
      const params = method.params?.map((p) => `${p.name}: ${p.type || 'unknown'}`).join(', ') || '';
      const returnType = method.returns?.type || 'void';
      lines.push(`- \`${method.name}(${params}): ${returnType}\``);
      if (method.description) {
        lines.push(`  - ${method.description}`);
      }
    }
  }

  // Examples
  if (options.includeExamples && cls.examples && cls.examples.length > 0) {
    lines.push('\n**Examples:**');
    for (const example of cls.examples) {
      if (example.includes('```')) {
        lines.push(example);
      } else {
        lines.push('```typescript');
        lines.push(example);
        lines.push('```');
      }
    }
  }

  return lines.join('\n');
}

/**
 * Format an interface entry
 */
function formatInterface(iface: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  lines.push(`#### \`${iface.name}\``);

  if (options.includeDeprecations && iface.deprecated) {
    lines.push(`\n> ⚠️ **Deprecated**`);
  }

  if (iface.description) {
    lines.push(`\n${iface.description}`);
  }

  // Signature with full definition
  lines.push('\n```typescript');
  let sig = iface.signature;
  if (iface.extends && iface.extends.length > 0) {
    sig += ` extends ${iface.extends.join(', ')}`;
  }
  lines.push(sig + ' {');

  // Properties
  if (iface.properties && iface.properties.length > 0) {
    for (const prop of iface.properties) {
      lines.push(`  ${prop.signature};`);
    }
  }

  // Methods
  if (iface.methods && iface.methods.length > 0) {
    for (const method of iface.methods) {
      lines.push(`  ${method.signature};`);
    }
  }

  lines.push('}');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format a type entry
 */
function formatType(type: APIEntry, options: FormatOptions): string {
  const lines: string[] = [];

  lines.push(`#### \`${type.name}\``);

  if (options.includeDeprecations && type.deprecated) {
    lines.push(`\n> ⚠️ **Deprecated**`);
  }

  if (type.description) {
    lines.push(`\n${type.description}`);
  }

  lines.push('\n```typescript');
  lines.push(type.signature);
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format an enum entry
 */
function formatEnum(enumEntry: APIEntry): string {
  const lines: string[] = [];

  lines.push(`#### \`${enumEntry.name}\``);

  if (enumEntry.description) {
    lines.push(`\n${enumEntry.description}`);
  }

  lines.push('\n```typescript');
  lines.push(`enum ${enumEntry.name} {`);

  if (enumEntry.members) {
    for (const member of enumEntry.members) {
      if (member.value !== undefined) {
        lines.push(`  ${member.name} = ${JSON.stringify(member.value)},`);
      } else {
        lines.push(`  ${member.name},`);
      }
    }
  }

  lines.push('}');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format a constant entry
 */
function formatConstant(constant: APIEntry): string {
  const lines: string[] = [];

  lines.push(`#### \`${constant.name}\``);

  if (constant.description) {
    lines.push(`\n${constant.description}`);
  }

  lines.push('\n```typescript');
  lines.push(constant.signature);
  lines.push('```');

  return lines.join('\n');
}
