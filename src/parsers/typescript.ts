/**
 * TypeScript source file parser
 * Fallback parser for packages without .d.ts files
 * @module parsers/typescript
 */

import type { APIEntry, ParamDoc } from '../types.js';
import { parseJSDoc, extractJSDocComments, findPrecedingJSDoc } from './jsdoc.js';

/**
 * Result of parsing TypeScript source
 */
export interface TsParseResult {
  exports: APIEntry[];
  hasTypes: boolean;
}

/**
 * Regex patterns for parsing TypeScript source
 */
const PATTERNS = {
  /** Export function */
  exportFunction:
    /export\s+(?:async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g,

  /** Export arrow function */
  exportArrow:
    /export\s+const\s+(\w+)\s*(?::\s*([^=]+))?\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*([^=]+))?\s*=>/g,

  /** Export class */
  exportClass:
    /export\s+(?:abstract\s+)?class\s+(\w+)(?:\s*<([^>]*)>)?(?:\s+extends\s+([^\s{]+))?(?:\s+implements\s+([^{]+))?\s*\{/g,

  /** Export interface */
  exportInterface:
    /export\s+interface\s+(\w+)(?:\s*<([^>]*)>)?(?:\s+extends\s+([^{]+))?\s*\{/g,

  /** Export type */
  exportType: /export\s+type\s+(\w+)(?:\s*<([^>]*)>)?\s*=\s*([^;]+)/g,

  /** Export const/let */
  exportConst: /export\s+(?:const|let)\s+(\w+)(?:\s*:\s*([^=]+))?\s*=/g,

  /** Export enum */
  exportEnum: /export\s+(?:const\s+)?enum\s+(\w+)\s*\{/g,

  /** Named export */
  namedExport: /export\s*\{\s*([^}]+)\s*\}/g,

  /** Default export */
  defaultExport: /export\s+default\s+(?:function\s+)?(\w+)/g,
};

/**
 * Parse function parameters from source
 */
function parseSourceParams(paramStr: string): ParamDoc[] {
  if (!paramStr.trim()) return [];

  const params: ParamDoc[] = [];
  const parts = splitParams(paramStr);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Handle destructuring
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const colonIndex = findBalancedColon(trimmed);
      if (colonIndex > 0) {
        params.push({
          name: 'options',
          type: trimmed.slice(colonIndex + 1).trim(),
          optional: trimmed.includes('?'),
        });
      } else {
        params.push({
          name: 'options',
          type: 'object',
        });
      }
      continue;
    }

    // Regular param: name: type = default
    const match = trimmed.match(/^(\w+)(\?)?\s*(?::\s*(.+?))?(?:\s*=\s*(.+))?$/);
    if (match && match[1]) {
      const [, name, optional, type, defaultValue] = match;
      params.push({
        name,
        type: type?.trim() || inferTypeFromDefault(defaultValue),
        optional: !!optional || !!defaultValue,
        defaultValue: defaultValue?.trim(),
      });
    }
  }

  return params;
}

/**
 * Split parameters handling nesting
 */
function splitParams(str: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (const char of str) {
    if (char === '<' || char === '{' || char === '[' || char === '(') {
      depth++;
      current += char;
    } else if (char === '>' || char === '}' || char === ']' || char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Find colon at depth 0
 */
function findBalancedColon(str: string): number {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '{' || char === '[' || char === '<' || char === '(') {
      depth++;
    } else if (char === '}' || char === ']' || char === '>' || char === ')') {
      depth--;
    } else if (char === ':' && depth === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Infer type from default value
 */
function inferTypeFromDefault(defaultValue?: string): string {
  if (!defaultValue) return 'unknown';

  const trimmed = defaultValue.trim();

  if (trimmed === 'true' || trimmed === 'false') return 'boolean';
  if (trimmed.startsWith("'") || trimmed.startsWith('"') || trimmed.startsWith('`')) {
    return 'string';
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return 'number';
  if (trimmed === 'null') return 'null';
  if (trimmed === 'undefined') return 'undefined';
  if (trimmed.startsWith('[')) return 'unknown[]';
  if (trimmed.startsWith('{')) return 'object';
  if (trimmed.startsWith('()') || trimmed.includes('=>')) return 'Function';

  return 'unknown';
}

/**
 * Extract body content from source
 */
function extractBody(source: string, startIndex: number): string {
  let depth = 0;
  let i = startIndex;

  while (i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }

  return source.slice(startIndex + 1, i);
}

/**
 * Parse TypeScript source file
 * @param content - Source file content
 * @param filePath - Optional file path
 * @returns Parse result
 */
export function parseTypeScript(content: string, filePath?: string): TsParseResult {
  const exports: APIEntry[] = [];
  let hasTypes = false;

  // Check if file has type annotations
  hasTypes = /:\s*\w+/.test(content) || content.includes('interface ') || content.includes('type ');

  // Pre-extract JSDoc comments
  const comments = extractJSDocComments(content);

  // Parse functions
  let match;
  PATTERNS.exportFunction.lastIndex = 0;
  while ((match = PATTERNS.exportFunction.exec(content)) !== null) {
    const [, name, generics, params, returnType] = match;
    if (!name) continue;
    const jsdoc = findPrecedingJSDoc(content, match.index, comments);
    const paramStr = params || '';

    exports.push({
      kind: 'function',
      name,
      signature: `function ${name}${generics || ''}(${paramStr})${returnType ? `: ${returnType.trim()}` : ''}`,
      description: jsdoc?.description,
      params: mergeParams(parseSourceParams(paramStr), jsdoc?.params),
      returns: returnType
        ? { type: returnType.trim(), description: jsdoc?.returns?.description }
        : undefined,
      examples: jsdoc?.examples,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  // Parse arrow functions
  PATTERNS.exportArrow.lastIndex = 0;
  while ((match = PATTERNS.exportArrow.exec(content)) !== null) {
    const [fullMatch, name, typeAnnotation, returnType] = match;
    if (!name || !fullMatch) continue;
    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    // Extract params from between ( and )
    const paramsStart = fullMatch.indexOf('(');
    const paramsEnd = fullMatch.indexOf(')', paramsStart);
    const params = fullMatch.slice(paramsStart + 1, paramsEnd);

    exports.push({
      kind: 'function',
      name,
      signature: typeAnnotation
        ? `const ${name}: ${typeAnnotation.trim()}`
        : `const ${name} = (${params})${returnType ? ` => ${returnType.trim()}` : ''}`,
      description: jsdoc?.description,
      params: mergeParams(parseSourceParams(params), jsdoc?.params),
      returns: returnType
        ? { type: returnType.trim(), description: jsdoc?.returns?.description }
        : undefined,
      examples: jsdoc?.examples,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  // Parse classes
  PATTERNS.exportClass.lastIndex = 0;
  while ((match = PATTERNS.exportClass.exec(content)) !== null) {
    const [, name, generics, extendsClause, implementsClause] = match;
    if (!name) continue;
    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    exports.push({
      kind: 'class',
      name,
      signature: `class ${name}${generics ? `<${generics}>` : ''}`,
      description: jsdoc?.description,
      extends: extendsClause ? [extendsClause.trim()] : undefined,
      implements: implementsClause
        ? implementsClause.split(',').map((s) => s.trim())
        : undefined,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  // Parse interfaces
  PATTERNS.exportInterface.lastIndex = 0;
  while ((match = PATTERNS.exportInterface.exec(content)) !== null) {
    const [, name, generics, extendsClause] = match;
    if (!name) continue;
    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    exports.push({
      kind: 'interface',
      name,
      signature: `interface ${name}${generics ? `<${generics}>` : ''}`,
      description: jsdoc?.description,
      extends: extendsClause
        ? extendsClause.split(',').map((s) => s.trim())
        : undefined,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  // Parse types
  PATTERNS.exportType.lastIndex = 0;
  while ((match = PATTERNS.exportType.exec(content)) !== null) {
    const [, name, generics, definition] = match;
    if (!name || !definition) continue;
    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    exports.push({
      kind: 'type',
      name,
      signature: `type ${name}${generics ? `<${generics}>` : ''} = ${definition.trim()}`,
      description: jsdoc?.description,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  // Parse constants
  PATTERNS.exportConst.lastIndex = 0;
  while ((match = PATTERNS.exportConst.exec(content)) !== null) {
    const [, name, type] = match;
    if (!name) continue;
    // Skip if this is an arrow function (already parsed)
    if (content.slice(match.index, match.index + 200).includes('=>')) continue;

    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    exports.push({
      kind: 'constant',
      name,
      signature: `const ${name}${type ? `: ${type.trim()}` : ''}`,
      description: jsdoc?.description,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  // Parse enums
  PATTERNS.exportEnum.lastIndex = 0;
  while ((match = PATTERNS.exportEnum.exec(content)) !== null) {
    const [, name] = match;
    if (!name) continue;
    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    exports.push({
      kind: 'enum',
      name,
      signature: `enum ${name}`,
      description: jsdoc?.description,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  return { exports, hasTypes };
}

/**
 * Merge params from source and JSDoc
 */
function mergeParams(sourceParams: ParamDoc[], jsdocParams?: typeof sourceParams): ParamDoc[] {
  if (!jsdocParams || jsdocParams.length === 0) return sourceParams;

  return sourceParams.map((param) => {
    const jsdocParam = jsdocParams.find((p) => p.name === param.name);
    if (jsdocParam) {
      return {
        ...param,
        description: jsdocParam.description || param.description,
        type: param.type !== 'unknown' ? param.type : jsdocParam.type,
      };
    }
    return param;
  });
}

/**
 * Find TypeScript source files in package
 * @param files - Map of file paths to content
 * @param mainField - Main field from package.json
 * @returns Paths to TypeScript source files
 */
export function findTypeScriptFiles(
  files: Map<string, string>,
  mainField?: string
): string[] {
  const tsFiles: string[] = [];
  const priorities: string[] = [];

  // Priority: main field variants
  if (mainField) {
    const base = mainField.replace(/^\.\//, '').replace(/\.[jt]sx?$/, '');
    priorities.push(
      `${base}.ts`,
      `${base}.tsx`,
      `src/${base}.ts`,
      `src/${base}.tsx`
    );
  }

  // Default priorities
  priorities.push(
    'src/index.ts',
    'src/index.tsx',
    'index.ts',
    'index.tsx',
    'lib/index.ts',
    'src/main.ts'
  );

  // Add prioritized files first
  for (const path of priorities) {
    if (files.has(path) && !tsFiles.includes(path)) {
      tsFiles.push(path);
    }
  }

  // Add remaining .ts/.tsx files
  for (const path of files.keys()) {
    if ((path.endsWith('.ts') || path.endsWith('.tsx')) && !path.endsWith('.d.ts')) {
      if (!tsFiles.includes(path)) {
        tsFiles.push(path);
      }
    }
  }

  return tsFiles;
}
