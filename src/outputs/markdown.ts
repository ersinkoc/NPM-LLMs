/**
 * Markdown output generator
 * Generates formatted API documentation in Markdown format
 * @module outputs/markdown
 */

import type { ExtractorContext, APIEntry, ParamDoc } from '../types.js';
import { countTokens } from '../core/tokens.js';

/**
 * Generate options for markdown output
 */
export interface MarkdownGenerateOptions {
  /** Include table of contents */
  includeToc?: boolean;
  /** Include parameter tables */
  includeParamTables?: boolean;
  /** Include badge section */
  includeBadges?: boolean;
  /** Repository URL for source links */
  repositoryUrl?: string;
}

/**
 * Generate markdown documentation from context
 * @param context - Extractor context
 * @param options - Generation options
 * @returns Generated markdown content
 */
export function generateMarkdown(
  context: ExtractorContext,
  options: MarkdownGenerateOptions = {}
): string {
  const {
    includeToc = true,
    includeParamTables = true,
    includeBadges = true,
    repositoryUrl,
  } = options;

  const { package: pkg, api, readme } = context;
  const sections: string[] = [];

  // Title
  sections.push(`# ${pkg.name}`);
  sections.push('');

  // Badges
  if (includeBadges) {
    const badges: string[] = [];
    badges.push(`![npm version](https://img.shields.io/npm/v/${encodeURIComponent(pkg.name)})`);
    if (pkg.license) {
      badges.push(`![license](https://img.shields.io/npm/l/${encodeURIComponent(pkg.name)})`);
    }
    if (badges.length > 0) {
      sections.push(badges.join(' '));
      sections.push('');
    }
  }

  // Description
  if (pkg.description) {
    sections.push(`> ${pkg.description}`);
    sections.push('');
  }

  // Table of Contents
  if (includeToc) {
    sections.push('## Table of Contents\n');
    sections.push('- [Installation](#installation)');
    if (readme?.quickStart) {
      sections.push('- [Quick Start](#quick-start)');
    }
    sections.push('- [API Reference](#api-reference)');

    const functions = api.filter((e) => e.kind === 'function');
    const classes = api.filter((e) => e.kind === 'class');
    const interfaces = api.filter((e) => e.kind === 'interface');
    const types = api.filter((e) => e.kind === 'type');

    if (functions.length > 0) {
      sections.push('  - [Functions](#functions)');
    }
    if (classes.length > 0) {
      sections.push('  - [Classes](#classes)');
    }
    if (interfaces.length > 0) {
      sections.push('  - [Interfaces](#interfaces)');
    }
    if (types.length > 0) {
      sections.push('  - [Types](#types)');
    }
    sections.push('');
  }

  // Installation
  sections.push('## Installation\n');
  sections.push('```bash');
  sections.push(`npm install ${pkg.name}`);
  sections.push('```\n');
  sections.push('Or with yarn:\n');
  sections.push('```bash');
  sections.push(`yarn add ${pkg.name}`);
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
  const enums = api.filter((e) => e.kind === 'enum');
  const constants = api.filter((e) => e.kind === 'constant');

  // Functions
  if (functions.length > 0) {
    sections.push('### Functions\n');
    for (const fn of functions) {
      sections.push(formatFunctionMd(fn, { includeParamTables, repositoryUrl }));
      sections.push('');
      sections.push('---\n');
    }
  }

  // Classes
  if (classes.length > 0) {
    sections.push('### Classes\n');
    for (const cls of classes) {
      sections.push(formatClassMd(cls, { includeParamTables, repositoryUrl }));
      sections.push('');
      sections.push('---\n');
    }
  }

  // Interfaces
  if (interfaces.length > 0) {
    sections.push('### Interfaces\n');
    for (const iface of interfaces) {
      sections.push(formatInterfaceMd(iface));
      sections.push('');
      sections.push('---\n');
    }
  }

  // Types
  if (types.length > 0) {
    sections.push('### Types\n');
    for (const type of types) {
      sections.push(formatTypeMd(type));
      sections.push('');
    }
  }

  // Enums
  if (enums.length > 0) {
    sections.push('### Enums\n');
    for (const enumEntry of enums) {
      sections.push(formatEnumMd(enumEntry));
      sections.push('');
    }
  }

  // Constants
  if (constants.length > 0) {
    sections.push('### Constants\n');
    for (const constant of constants) {
      sections.push(formatConstantMd(constant));
    }
    sections.push('');
  }

  const output = sections.join('\n');
  context.tokenCount = countTokens(output);
  return output;
}

/**
 * Format options
 */
interface FormatMdOptions {
  includeParamTables?: boolean;
  repositoryUrl?: string;
}

/**
 * Format function for markdown
 */
function formatFunctionMd(fn: APIEntry, options: FormatMdOptions): string {
  const lines: string[] = [];

  // Anchor and title
  const anchor = fn.name.toLowerCase();
  lines.push(`<a name="${anchor}"></a>`);
  lines.push(`#### \`${fn.name}()\``);

  // Deprecation warning
  if (fn.deprecated) {
    lines.push(`\n> ⚠️ **Deprecated:** ${typeof fn.deprecated === 'string' ? fn.deprecated : 'This function is deprecated.'}\n`);
  }

  // Description
  if (fn.description) {
    lines.push(`\n${fn.description}\n`);
  }

  // Signature
  lines.push('**Signature:**\n');
  lines.push('```typescript');
  lines.push(fn.signature);
  lines.push('```\n');

  // Parameters table
  if (fn.params && fn.params.length > 0 && options.includeParamTables) {
    lines.push('**Parameters:**\n');
    lines.push('| Name | Type | Required | Description |');
    lines.push('|------|------|----------|-------------|');
    for (const param of fn.params) {
      const required = param.optional ? 'No' : 'Yes';
      const desc = param.description || '-';
      const defaultVal = param.defaultValue ? ` (default: \`${param.defaultValue}\`)` : '';
      lines.push(`| \`${param.name}\` | \`${param.type || 'unknown'}\` | ${required} | ${desc}${defaultVal} |`);
    }
    lines.push('');
  }

  // Returns
  if (fn.returns) {
    lines.push('**Returns:**\n');
    lines.push(`\`${fn.returns.type}\`${fn.returns.description ? ` - ${fn.returns.description}` : ''}\n`);
  }

  // Examples
  if (fn.examples && fn.examples.length > 0) {
    lines.push('**Example:**\n');
    for (const example of fn.examples) {
      if (example.includes('```')) {
        lines.push(example);
      } else {
        lines.push('```typescript');
        lines.push(example);
        lines.push('```');
      }
    }
    lines.push('');
  }

  // Source link
  if (options.repositoryUrl && fn.sourceFile) {
    const sourceUrl = `${options.repositoryUrl}/blob/main/${fn.sourceFile}${fn.line ? `#L${fn.line}` : ''}`;
    lines.push(`[View source](${sourceUrl})\n`);
  }

  return lines.join('\n');
}

/**
 * Format class for markdown
 */
function formatClassMd(cls: APIEntry, options: FormatMdOptions): string {
  const lines: string[] = [];

  const anchor = cls.name.toLowerCase();
  lines.push(`<a name="${anchor}"></a>`);
  lines.push(`#### \`${cls.name}\``);

  if (cls.deprecated) {
    lines.push(`\n> ⚠️ **Deprecated**\n`);
  }

  if (cls.description) {
    lines.push(`\n${cls.description}\n`);
  }

  // Inheritance
  if (cls.extends && cls.extends.length > 0) {
    lines.push(`**Extends:** ${cls.extends.map((e) => `\`${e}\``).join(', ')}\n`);
  }
  if (cls.implements && cls.implements.length > 0) {
    lines.push(`**Implements:** ${cls.implements.map((e) => `\`${e}\``).join(', ')}\n`);
  }

  // Constructor (if we have it)
  const constructor = cls.methods?.find((m) => m.name === 'constructor');
  if (constructor) {
    lines.push('**Constructor:**\n');
    lines.push('```typescript');
    lines.push(`new ${cls.name}(${constructor.params?.map((p) => `${p.name}: ${p.type}`).join(', ') || ''})`);
    lines.push('```\n');
  }

  // Properties
  if (cls.properties && cls.properties.length > 0) {
    lines.push('**Properties:**\n');
    lines.push('| Name | Type | Description |');
    lines.push('|------|------|-------------|');
    for (const prop of cls.properties) {
      const type = prop.signature.split(':').slice(1).join(':').trim() || 'unknown';
      lines.push(`| \`${prop.name}\` | \`${type}\` | ${prop.description || '-'} |`);
    }
    lines.push('');
  }

  // Methods
  const methods = cls.methods?.filter((m) => m.name !== 'constructor') || [];
  if (methods.length > 0) {
    lines.push('**Methods:**\n');
    lines.push('| Method | Returns | Description |');
    lines.push('|--------|---------|-------------|');
    for (const method of methods) {
      const params = method.params?.map((p) => `${p.name}`).join(', ') || '';
      const returnType = method.returns?.type || 'void';
      lines.push(`| \`${method.name}(${params})\` | \`${returnType}\` | ${method.description || '-'} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format interface for markdown
 */
function formatInterfaceMd(iface: APIEntry): string {
  const lines: string[] = [];

  lines.push(`#### \`${iface.name}\``);

  if (iface.description) {
    lines.push(`\n${iface.description}\n`);
  }

  if (iface.extends && iface.extends.length > 0) {
    lines.push(`**Extends:** ${iface.extends.map((e) => `\`${e}\``).join(', ')}\n`);
  }

  // Properties table
  if (iface.properties && iface.properties.length > 0) {
    lines.push('| Property | Type | Description |');
    lines.push('|----------|------|-------------|');
    for (const prop of iface.properties) {
      const type = prop.signature.split(':').slice(1).join(':').trim() || 'unknown';
      lines.push(`| \`${prop.name}\` | \`${type}\` | ${prop.description || '-'} |`);
    }
    lines.push('');
  }

  // Full definition
  lines.push('<details>');
  lines.push('<summary>Full Definition</summary>\n');
  lines.push('```typescript');
  lines.push(`interface ${iface.name} {`);
  if (iface.properties) {
    for (const prop of iface.properties) {
      lines.push(`  ${prop.signature};`);
    }
  }
  if (iface.methods) {
    for (const method of iface.methods) {
      lines.push(`  ${method.signature};`);
    }
  }
  lines.push('}');
  lines.push('```');
  lines.push('</details>');

  return lines.join('\n');
}

/**
 * Format type for markdown
 */
function formatTypeMd(type: APIEntry): string {
  const lines: string[] = [];

  lines.push(`#### \`${type.name}\``);

  if (type.description) {
    lines.push(`\n${type.description}\n`);
  }

  lines.push('```typescript');
  lines.push(type.signature);
  lines.push('```');

  return lines.join('\n');
}

/**
 * Format enum for markdown
 */
function formatEnumMd(enumEntry: APIEntry): string {
  const lines: string[] = [];

  lines.push(`#### \`${enumEntry.name}\``);

  if (enumEntry.description) {
    lines.push(`\n${enumEntry.description}\n`);
  }

  if (enumEntry.members && enumEntry.members.length > 0) {
    lines.push('| Member | Value |');
    lines.push('|--------|-------|');
    for (const member of enumEntry.members) {
      const value = member.value !== undefined ? `\`${JSON.stringify(member.value)}\`` : '-';
      lines.push(`| \`${member.name}\` | ${value} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format constant for markdown
 */
function formatConstantMd(constant: APIEntry): string {
  const lines: string[] = [];

  lines.push(`- **\`${constant.name}\`**: \`${constant.signature.split(':').slice(1).join(':').trim() || 'unknown'}\``);
  if (constant.description) {
    lines.push(`  - ${constant.description}`);
  }

  return lines.join('\n');
}
