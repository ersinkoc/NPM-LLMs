/**
 * TypeScript declaration file (.d.ts) parser
 * Extracts exported API entries from declaration files
 * @module parsers/dts
 */

import type { APIEntry, APIEntryKind, ParamDoc, ReturnDoc, JSDocParsed } from '../types.js';
import { parseJSDoc, extractJSDocComments, findPrecedingJSDoc } from './jsdoc.js';

/**
 * Result of parsing a .d.ts file
 */
export interface DtsParseResult {
  /** Exported API entries */
  exports: APIEntry[];
  /** Imported types (for reference) */
  imports: string[];
  /** Module declaration if wrapped in declare module */
  moduleName?: string;
}

/**
 * Regex patterns for parsing declarations
 */
const PATTERNS = {
  /** Export function declaration */
  exportFunction:
    /export\s+(?:declare\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)\s*:\s*([^;{]+)/g,

  /** Export const declaration */
  exportConst: /export\s+(?:declare\s+)?const\s+(\w+)\s*:\s*([^;=]+)/g,

  /** Export let declaration */
  exportLet: /export\s+(?:declare\s+)?let\s+(\w+)\s*:\s*([^;=]+)/g,

  /** Export class declaration */
  exportClass:
    /export\s+(?:declare\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s*<([^>]*)>)?(?:\s+extends\s+([^\s{]+))?(?:\s+implements\s+([^{]+))?\s*\{/g,

  /** Export interface declaration */
  exportInterface:
    /export\s+(?:declare\s+)?interface\s+(\w+)(?:\s*<([^>]*)>)?(?:\s+extends\s+([^{]+))?\s*\{/g,

  /** Export type declaration */
  exportType: /export\s+(?:declare\s+)?type\s+(\w+)(?:\s*<([^>]*)>)?\s*=\s*([^;]+)/g,

  /** Export enum declaration */
  exportEnum: /export\s+(?:declare\s+)?(?:const\s+)?enum\s+(\w+)\s*\{/g,

  /** Export default */
  exportDefault: /export\s+default\s+(\w+)/g,

  /** Re-export */
  reExport: /export\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g,

  /** Import statement */
  importStatement: /import\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s*from\s*['"]([^'"]+)['"]/g,

  /** Declare module */
  declareModule: /declare\s+module\s+['"]([^'"]+)['"]\s*\{/g,
};

/**
 * Parse function parameters from parameter string
 * @param paramStr - Parameter string (e.g., "a: string, b?: number")
 * @returns Array of parsed parameters
 */
export function parseParameters(paramStr: string): ParamDoc[] {
  if (!paramStr.trim()) return [];

  const params: ParamDoc[] = [];
  const parts = splitParameters(paramStr);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    // Handle destructuring patterns
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      // Simplified: treat as single param
      const colonIndex = findTypeColonIndex(trimmed);
      if (colonIndex > 0) {
        params.push({
          name: 'options',
          type: trimmed.slice(colonIndex + 1).trim(),
          optional: trimmed.includes('?'),
        });
      }
      continue;
    }

    // Parse regular parameter: name?: type = default
    const match = trimmed.match(/^(\w+)(\?)?\s*:\s*(.+?)(?:\s*=\s*(.+))?$/);
    if (match) {
      const [, name, optional, type, defaultValue] = match;
      if (name && type) {
        params.push({
          name,
          type: type.trim(),
          optional: !!optional,
          defaultValue: defaultValue?.trim(),
        });
      }
    } else {
      // Just a name
      const nameMatch = trimmed.match(/^(\w+)(\?)?$/);
      if (nameMatch && nameMatch[1]) {
        params.push({
          name: nameMatch[1],
          type: 'unknown',
          optional: !!nameMatch[2],
        });
      }
    }
  }

  return params;
}

/**
 * Split parameters handling nested generics and objects
 */
function splitParameters(paramStr: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < paramStr.length; i++) {
    const char = paramStr[i];

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

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

/**
 * Find the colon separating name from type in complex patterns
 */
function findTypeColonIndex(str: string): number {
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
 * Parse class/interface body to extract members
 * @param source - Full source content
 * @param startIndex - Index of opening brace
 * @returns Extracted body content
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
 * Parse class members from body
 */
function parseClassMembers(
  body: string,
  comments: Array<{ comment: string; start: number; end: number }>,
  bodyOffset: number
): { methods: APIEntry[]; properties: APIEntry[] } {
  const methods: APIEntry[] = [];
  const properties: APIEntry[] = [];

  // Parse methods
  const methodPattern = /(?:(?:public|private|protected|static|readonly)\s+)*(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)\s*:\s*([^;{]+)/g;
  let match;

  while ((match = methodPattern.exec(body)) !== null) {
    const [fullMatch, name, generics, params, returnType] = match;
    if (!name || !returnType) continue;

    const jsdoc = findPrecedingJSDoc(body, match.index, comments.map(c => ({
      ...c,
      start: c.start - bodyOffset,
      end: c.end - bodyOffset,
    })));

    methods.push({
      kind: 'function',
      name,
      signature: `${name}${generics || ''}(${params || ''}): ${returnType.trim()}`,
      description: jsdoc?.description,
      params: mergeParamDocs(parseParameters(params || ''), jsdoc?.params),
      returns: {
        type: returnType.trim(),
        description: jsdoc?.returns?.description,
      },
      examples: jsdoc?.examples,
    });
  }

  // Parse properties
  const propPattern = /(?:(?:public|private|protected|static|readonly)\s+)*(\w+)(\?)?\s*:\s*([^;]+)/g;
  while ((match = propPattern.exec(body)) !== null) {
    const [, name, optional, type] = match;
    if (!name || !type) continue;
    // Skip if it looks like a method
    if (type.includes('=>') || type.includes('(')) continue;

    properties.push({
      kind: 'constant',
      name,
      signature: `${name}${optional || ''}: ${type.trim()}`,
      description: findPrecedingJSDoc(body, match.index)?.description,
    });
  }

  return { methods, properties };
}

/**
 * Merge param docs from signature and JSDoc
 */
function mergeParamDocs(
  sigParams: ParamDoc[],
  jsdocParams?: JSDocParsed['params']
): ParamDoc[] {
  if (!jsdocParams || jsdocParams.length === 0) return sigParams;

  return sigParams.map((param) => {
    const jsdocParam = jsdocParams.find((p) => p.name === param.name);
    if (jsdocParam) {
      return {
        ...param,
        description: jsdocParam.description || param.description,
        type: param.type || jsdocParam.type,
        optional: param.optional || jsdocParam.optional,
        defaultValue: param.defaultValue || jsdocParam.defaultValue,
      };
    }
    return param;
  });
}

/**
 * Parse enum members from body
 */
function parseEnumMembers(body: string): Array<{ name: string; value?: string | number }> {
  const members: Array<{ name: string; value?: string | number }> = [];
  const pattern = /(\w+)\s*(?:=\s*([^,}]+))?/g;

  let match;
  while ((match = pattern.exec(body)) !== null) {
    const [, name, value] = match;
    if (!name) continue;

    let parsedValue: string | number | undefined;
    if (value !== undefined) {
      const trimmed = value.trim();
      // Try to parse as number
      const num = Number(trimmed);
      if (!isNaN(num)) {
        parsedValue = num;
      } else {
        // Keep as string (remove quotes)
        parsedValue = trimmed.replace(/^['"]|['"]$/g, '');
      }
    }

    members.push({ name, value: parsedValue });
  }

  return members;
}

/**
 * Parse a .d.ts file content
 * @param content - File content
 * @param filePath - Optional file path for source location
 * @returns Parse result with exports
 * @example
 * ```typescript
 * const result = parseDts(`
 *   export declare function greet(name: string): string;
 *   export interface Options { timeout: number; }
 * `);
 * console.log(result.exports.length); // 2
 * ```
 */
export function parseDts(content: string, filePath?: string): DtsParseResult {
  const exports: APIEntry[] = [];
  const imports: string[] = [];
  let moduleName: string | undefined;

  // Pre-extract all JSDoc comments
  const comments = extractJSDocComments(content);

  // Check for module declaration
  const moduleMatch = PATTERNS.declareModule.exec(content);
  if (moduleMatch) {
    moduleName = moduleMatch[1];
  }

  // Parse functions
  let match;
  PATTERNS.exportFunction.lastIndex = 0;
  while ((match = PATTERNS.exportFunction.exec(content)) !== null) {
    const [fullMatch, name, generics, params, returnType] = match;
    if (!name || !returnType) continue;

    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    exports.push({
      kind: 'function',
      name,
      signature: `function ${name}${generics || ''}(${params || ''}): ${returnType.trim()}`,
      description: jsdoc?.description,
      params: mergeParamDocs(parseParameters(params || ''), jsdoc?.params),
      returns: {
        type: returnType.trim(),
        description: jsdoc?.returns?.description,
      },
      examples: jsdoc?.examples,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      since: jsdoc?.since,
      see: jsdoc?.see,
      sourceFile: filePath,
    });
  }

  // Parse constants
  PATTERNS.exportConst.lastIndex = 0;
  while ((match = PATTERNS.exportConst.exec(content)) !== null) {
    const [, name, type] = match;
    if (!name || !type) continue;

    const jsdoc = findPrecedingJSDoc(content, match.index, comments);

    exports.push({
      kind: 'constant',
      name,
      signature: `const ${name}: ${type.trim()}`,
      description: jsdoc?.description,
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

    // Extract class body
    const bodyStart = match.index + match[0].length - 1;
    const body = extractBody(content, bodyStart);
    const { methods, properties } = parseClassMembers(body, comments, bodyStart);

    exports.push({
      kind: 'class',
      name,
      signature: `class ${name}${generics ? `<${generics}>` : ''}`,
      description: jsdoc?.description,
      extends: extendsClause ? [extendsClause.trim()] : undefined,
      implements: implementsClause
        ? implementsClause.split(',').map((s) => s.trim())
        : undefined,
      methods,
      properties,
      typeParams: generics
        ? generics.split(',').map((s) => s.trim())
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

    // Extract interface body
    const bodyStart = match.index + match[0].length - 1;
    const body = extractBody(content, bodyStart);
    const { methods, properties } = parseClassMembers(body, comments, bodyStart);

    exports.push({
      kind: 'interface',
      name,
      signature: `interface ${name}${generics ? `<${generics}>` : ''}`,
      description: jsdoc?.description,
      extends: extendsClause
        ? extendsClause.split(',').map((s) => s.trim())
        : undefined,
      methods,
      properties,
      typeParams: generics
        ? generics.split(',').map((s) => s.trim())
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
      typeParams: generics
        ? generics.split(',').map((s) => s.trim())
        : undefined,
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

    // Extract enum body
    const bodyStart = match.index + match[0].length - 1;
    const body = extractBody(content, bodyStart);
    const members = parseEnumMembers(body);

    exports.push({
      kind: 'enum',
      name,
      signature: `enum ${name}`,
      description: jsdoc?.description,
      members,
      deprecated: jsdoc?.deprecated ? jsdoc.deprecated : undefined,
      sourceFile: filePath,
    });
  }

  // Parse imports for reference
  PATTERNS.importStatement.lastIndex = 0;
  while ((match = PATTERNS.importStatement.exec(content)) !== null) {
    if (match[1]) {
      imports.push(match[1]);
    }
  }

  return { exports, imports, moduleName };
}

/**
 * Sort exports by kind priority
 * @param exports - Exports to sort
 * @returns Sorted exports
 */
export function sortExports(exports: APIEntry[]): APIEntry[] {
  const kindOrder: Record<APIEntryKind, number> = {
    function: 1,
    class: 2,
    interface: 3,
    type: 4,
    enum: 5,
    constant: 6,
  };

  return [...exports].sort((a, b) => {
    const kindDiff = kindOrder[a.kind] - kindOrder[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Find the main entry point .d.ts file
 * @param files - Map of file paths to content
 * @param typesField - Types field from package.json
 * @returns Path to main .d.ts file
 */
export function findMainDtsFile(
  files: Map<string, string>,
  typesField?: string
): string | undefined {
  // Priority 1: Explicit types field
  if (typesField) {
    const normalized = typesField.replace(/^\.\//, '');
    if (files.has(normalized)) return normalized;
  }

  // Priority 2: Common entry points
  const priorities = [
    'index.d.ts',
    'dist/index.d.ts',
    'lib/index.d.ts',
    'types/index.d.ts',
    'src/index.d.ts',
  ];

  for (const path of priorities) {
    if (files.has(path)) return path;
  }

  // Priority 3: Any .d.ts file
  for (const path of files.keys()) {
    if (path.endsWith('.d.ts')) return path;
  }

  return undefined;
}
