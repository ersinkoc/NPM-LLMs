/**
 * JSON output generator
 * Generates structured JSON documentation for programmatic use
 * @module outputs/json
 */

import type { ExtractorContext, APIEntry, PackageMetadata } from '../types.js';

/**
 * JSON output structure
 */
export interface JsonOutput {
  /** Schema version */
  $schema: string;
  /** Generation timestamp */
  generatedAt: string;
  /** Package metadata */
  package: {
    name: string;
    version: string;
    description?: string;
    license?: string;
    homepage?: string;
    repository?: string;
    keywords?: string[];
  };
  /** API entries */
  api: {
    functions: ApiFunction[];
    classes: ApiClass[];
    interfaces: ApiInterface[];
    types: ApiType[];
    enums: ApiEnum[];
    constants: ApiConstant[];
  };
  /** Statistics */
  stats: {
    totalExports: number;
    functions: number;
    classes: number;
    interfaces: number;
    types: number;
    enums: number;
    constants: number;
    documented: number;
    withExamples: number;
  };
}

/**
 * Function entry in JSON output
 */
export interface ApiFunction {
  name: string;
  signature: string;
  description?: string;
  params: Array<{
    name: string;
    type: string;
    optional: boolean;
    defaultValue?: string;
    description?: string;
  }>;
  returns?: {
    type: string;
    description?: string;
  };
  examples: string[];
  deprecated?: string | boolean;
  since?: string;
  see?: string[];
  sourceFile?: string;
  line?: number;
}

/**
 * Class entry in JSON output
 */
export interface ApiClass {
  name: string;
  signature: string;
  description?: string;
  extends?: string[];
  implements?: string[];
  typeParams?: string[];
  properties: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  methods: ApiFunction[];
  deprecated?: string | boolean;
  sourceFile?: string;
}

/**
 * Interface entry in JSON output
 */
export interface ApiInterface {
  name: string;
  signature: string;
  description?: string;
  extends?: string[];
  typeParams?: string[];
  properties: Array<{
    name: string;
    type: string;
    optional: boolean;
    description?: string;
  }>;
  methods: Array<{
    name: string;
    signature: string;
    description?: string;
  }>;
  deprecated?: string | boolean;
}

/**
 * Type entry in JSON output
 */
export interface ApiType {
  name: string;
  signature: string;
  description?: string;
  typeParams?: string[];
  deprecated?: string | boolean;
}

/**
 * Enum entry in JSON output
 */
export interface ApiEnum {
  name: string;
  description?: string;
  members: Array<{
    name: string;
    value?: string | number;
  }>;
}

/**
 * Constant entry in JSON output
 */
export interface ApiConstant {
  name: string;
  type: string;
  description?: string;
}

/**
 * Generate options for JSON output
 */
export interface JsonGenerateOptions {
  /** Pretty print with indentation */
  pretty?: boolean;
  /** Include empty arrays */
  includeEmpty?: boolean;
  /** Include source locations */
  includeSourceLocations?: boolean;
}

/**
 * Generate JSON documentation from context
 * @param context - Extractor context
 * @param options - Generation options
 * @returns Generated JSON string
 */
export function generateJson(
  context: ExtractorContext,
  options: JsonGenerateOptions = {}
): string {
  const { pretty = true, includeEmpty = false, includeSourceLocations = true } = options;

  const output = generateJsonObject(context, { includeEmpty, includeSourceLocations });
  return pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);
}

/**
 * Generate JSON object from context
 * @param context - Extractor context
 * @param options - Generation options
 * @returns JSON output object
 */
export function generateJsonObject(
  context: ExtractorContext,
  options: { includeEmpty?: boolean; includeSourceLocations?: boolean } = {}
): JsonOutput {
  const { includeEmpty = false, includeSourceLocations = true } = options;
  const { package: pkg, api } = context;

  // Group by kind
  const functions = api.filter((e) => e.kind === 'function');
  const classes = api.filter((e) => e.kind === 'class');
  const interfaces = api.filter((e) => e.kind === 'interface');
  const types = api.filter((e) => e.kind === 'type');
  const enums = api.filter((e) => e.kind === 'enum');
  const constants = api.filter((e) => e.kind === 'constant');

  // Calculate stats
  const documented = api.filter((e) => e.description).length;
  const withExamples = api.filter((e) => e.examples && e.examples.length > 0).length;

  const output: JsonOutput = {
    $schema: 'https://npm-llms.oxog.dev/schema/v1.json',
    generatedAt: new Date().toISOString(),
    package: {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      license: pkg.license,
      homepage: pkg.homepage,
      repository: pkg.repository?.url,
      keywords: pkg.keywords,
    },
    api: {
      functions: functions.map((fn) => transformFunction(fn, includeSourceLocations)),
      classes: classes.map((cls) => transformClass(cls, includeSourceLocations)),
      interfaces: interfaces.map(transformInterface),
      types: types.map(transformType),
      enums: enums.map(transformEnum),
      constants: constants.map(transformConstant),
    },
    stats: {
      totalExports: api.length,
      functions: functions.length,
      classes: classes.length,
      interfaces: interfaces.length,
      types: types.length,
      enums: enums.length,
      constants: constants.length,
      documented,
      withExamples,
    },
  };

  // Remove empty arrays if not wanted
  if (!includeEmpty) {
    const apiObj = output.api as Record<string, unknown[]>;
    for (const [key, value] of Object.entries(apiObj)) {
      if (Array.isArray(value) && value.length === 0) {
        delete apiObj[key];
      }
    }
  }

  return output;
}

/**
 * Transform function entry
 */
function transformFunction(entry: APIEntry, includeSource: boolean): ApiFunction {
  const result: ApiFunction = {
    name: entry.name,
    signature: entry.signature,
    description: entry.description,
    params: (entry.params || []).map((p) => ({
      name: p.name,
      type: p.type || 'unknown',
      optional: p.optional ?? false,
      defaultValue: p.defaultValue,
      description: p.description,
    })),
    returns: entry.returns
      ? {
          type: entry.returns.type,
          description: entry.returns.description,
        }
      : undefined,
    examples: entry.examples || [],
    deprecated: entry.deprecated,
    since: entry.since,
    see: entry.see,
  };

  if (includeSource) {
    result.sourceFile = entry.sourceFile;
    result.line = entry.line;
  }

  return result;
}

/**
 * Transform class entry
 */
function transformClass(entry: APIEntry, includeSource: boolean): ApiClass {
  const result: ApiClass = {
    name: entry.name,
    signature: entry.signature,
    description: entry.description,
    extends: entry.extends,
    implements: entry.implements,
    typeParams: entry.typeParams,
    properties: (entry.properties || []).map((p) => ({
      name: p.name,
      type: p.signature.split(':').slice(1).join(':').trim() || 'unknown',
      description: p.description,
    })),
    methods: (entry.methods || []).map((m) => transformFunction(m, includeSource)),
    deprecated: entry.deprecated,
  };

  if (includeSource) {
    result.sourceFile = entry.sourceFile;
  }

  return result;
}

/**
 * Transform interface entry
 */
function transformInterface(entry: APIEntry): ApiInterface {
  return {
    name: entry.name,
    signature: entry.signature,
    description: entry.description,
    extends: entry.extends,
    typeParams: entry.typeParams,
    properties: (entry.properties || []).map((p) => ({
      name: p.name,
      type: p.signature.split(':').slice(1).join(':').trim() || 'unknown',
      optional: p.signature.includes('?:'),
      description: p.description,
    })),
    methods: (entry.methods || []).map((m) => ({
      name: m.name,
      signature: m.signature,
      description: m.description,
    })),
    deprecated: entry.deprecated,
  };
}

/**
 * Transform type entry
 */
function transformType(entry: APIEntry): ApiType {
  return {
    name: entry.name,
    signature: entry.signature,
    description: entry.description,
    typeParams: entry.typeParams,
    deprecated: entry.deprecated,
  };
}

/**
 * Transform enum entry
 */
function transformEnum(entry: APIEntry): ApiEnum {
  return {
    name: entry.name,
    description: entry.description,
    members: entry.members || [],
  };
}

/**
 * Transform constant entry
 */
function transformConstant(entry: APIEntry): ApiConstant {
  return {
    name: entry.name,
    type: entry.signature.split(':').slice(1).join(':').trim() || 'unknown',
    description: entry.description,
  };
}

/**
 * Validate JSON output against schema
 * @param json - JSON output object
 * @returns Validation result
 */
export function validateJsonOutput(json: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!json || typeof json !== 'object') {
    errors.push('Output must be an object');
    return { valid: false, errors };
  }

  const obj = json as Record<string, unknown>;

  // Required fields
  if (!obj.$schema) errors.push('Missing $schema field');
  if (!obj.generatedAt) errors.push('Missing generatedAt field');
  if (!obj.package) errors.push('Missing package field');
  if (!obj.api) errors.push('Missing api field');
  if (!obj.stats) errors.push('Missing stats field');

  // Package validation
  if (obj.package && typeof obj.package === 'object') {
    const pkg = obj.package as Record<string, unknown>;
    if (!pkg.name) errors.push('Missing package.name');
    if (!pkg.version) errors.push('Missing package.version');
  }

  return { valid: errors.length === 0, errors };
}
