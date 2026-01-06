/**
 * Core type definitions for @oxog/npm-llms
 * @module types
 */

// ============================================================================
// Plugin Types
// ============================================================================

/**
 * Plugin category for organization
 */
export type PluginCategory = 'parser' | 'output' | 'ai' | 'utility';

/**
 * Plugin interface for extending kernel functionality.
 * @typeParam TContext - Shared context type between plugins
 */
export interface Plugin<TContext = ExtractorContext> {
  /** Unique plugin identifier (kebab-case) */
  name: string;

  /** Semantic version (e.g., "1.0.0") */
  version: string;

  /** Plugin category for organization */
  category: PluginCategory;

  /** Other plugins this plugin depends on */
  dependencies?: string[];

  /**
   * Called when plugin is registered.
   * @param kernel - The kernel instance
   */
  install: (kernel: Kernel<TContext>) => void;

  /**
   * Called after all plugins are installed.
   * @param context - Shared context object
   */
  onInit?: (context: TContext) => void | Promise<void>;

  /**
   * Called when plugin is unregistered.
   */
  onDestroy?: () => void | Promise<void>;

  /**
   * Called on error in this plugin.
   * @param error - The error that occurred
   */
  onError?: (error: Error) => void;
}

/**
 * Plugin information for listing
 */
export interface PluginInfo {
  name: string;
  version: string;
  category: PluginCategory;
  dependencies: string[];
}

// ============================================================================
// Kernel Types
// ============================================================================

/**
 * Event handler function type
 */
export type EventHandler<TContext = ExtractorContext> = (
  context: TContext,
  ...args: unknown[]
) => void | Promise<void>;

/**
 * Kernel interface for plugin management
 */
export interface Kernel<TContext = ExtractorContext> {
  /** Register a plugin */
  use(plugin: Plugin<TContext>): this;

  /** Unregister a plugin */
  unregister(name: string): boolean;

  /** Subscribe to an event */
  on(event: string, handler: EventHandler<TContext>): void;

  /** Unsubscribe from an event */
  off(event: string, handler: EventHandler<TContext>): void;

  /** Emit an event */
  emit(event: string, context: TContext, ...args: unknown[]): Promise<void>;

  /** List all plugins */
  listPlugins(): PluginInfo[];

  /** Get a plugin by name */
  getPlugin(name: string): Plugin<TContext> | undefined;

  /** Check if a plugin is registered */
  hasPlugin(name: string): boolean;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Enable caching. @default true */
  enabled?: boolean;
  /** Cache directory. @default '.npm-llms-cache' */
  dir?: string;
  /** Cache TTL in milliseconds. @default 604800000 (7 days) */
  ttl?: number;
}

/**
 * AI provider names
 */
export type AIProviderName = 'claude' | 'openai' | 'gemini' | 'ollama' | 'groq';

/**
 * AI provider configuration
 */
export interface AIProviderOptions {
  /** AI provider name */
  provider: AIProviderName;
  /** API key for the provider */
  apiKey?: string;
  /** Model identifier */
  model?: string;
  /** Base URL for API (useful for Ollama) */
  baseUrl?: string;
  /** Request timeout in ms. @default 30000 */
  timeout?: number;
}

/**
 * Configuration options for the extractor
 */
export interface ExtractorOptions {
  /**
   * Cache configuration for packages and AI responses.
   * @default { enabled: true, dir: '.npm-llms-cache', ttl: 604800000 }
   */
  cache?: CacheOptions;

  /**
   * AI provider configuration for documentation enrichment.
   * @default undefined (AI disabled)
   */
  ai?: AIProviderOptions;

  /**
   * Additional plugins to load on creation.
   * @default []
   */
  plugins?: Plugin[];

  /**
   * NPM registry URL.
   * @default 'https://registry.npmjs.org'
   */
  registry?: string;

  /**
   * Temporary directory for package extraction.
   * @default os.tmpdir()
   */
  tempDir?: string;

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean;
}

// ============================================================================
// Extract Options Types
// ============================================================================

/**
 * Output format types
 */
export type OutputFormat = 'llms' | 'llms-full' | 'markdown' | 'json' | 'html';

/**
 * AI enrichment tasks
 */
export type AITask = 'descriptions' | 'examples' | 'summary' | 'params' | 'returns';

/**
 * Content priority for truncation
 */
export type ContentPriority =
  | 'functions'
  | 'classes'
  | 'interfaces'
  | 'types'
  | 'examples'
  | 'readme';

/**
 * Options for the extract method
 */
export interface ExtractOptions {
  /** Output formats to generate. @default ['llms', 'llms-full', 'markdown', 'json'] */
  formats?: OutputFormat[];
  /** Enable AI enrichment. @default false */
  enrichWithAI?: boolean;
  /** AI tasks to perform. @default ['descriptions', 'examples', 'summary'] */
  aiTasks?: AITask[];
  /** Maximum tokens for llms.txt. @default 2000 */
  llmsTokenLimit?: number;
  /** Content to prioritize when truncating. @default ['functions', 'examples'] */
  prioritize?: ContentPriority[];
  /** Ignore cache and force fresh extraction. @default false */
  ignoreCache?: boolean;
}

// ============================================================================
// Package Types
// ============================================================================

/**
 * Package metadata from NPM registry
 */
export interface PackageMetadata {
  /** Package name */
  name: string;
  /** Package version */
  version: string;
  /** Package description */
  description?: string;
  /** Tarball download URL */
  tarball: string;
  /** Types/typings entry point */
  types?: string;
  /** Main entry point */
  main?: string;
  /** Exports field */
  exports?: Record<string, unknown>;
  /** Repository info */
  repository?: {
    type: string;
    url: string;
  };
  /** Keywords */
  keywords?: string[];
  /** Author */
  author?: string | { name: string; email?: string };
  /** License */
  license?: string;
  /** Homepage URL */
  homepage?: string;
}

/**
 * Package info with files
 */
export interface PackageInfo extends PackageMetadata {
  /** Map of file paths to content */
  files: Map<string, string>;
}

// ============================================================================
// API Entry Types
// ============================================================================

/**
 * API entry kind
 */
export type APIEntryKind = 'function' | 'class' | 'interface' | 'type' | 'constant' | 'enum';

/**
 * Parameter documentation
 */
export interface ParamDoc {
  /** Parameter name */
  name: string;
  /** Parameter type */
  type?: string;
  /** Parameter description */
  description?: string;
  /** Whether parameter is optional */
  optional?: boolean;
  /** Default value if any */
  defaultValue?: string;
}

/**
 * Return value documentation
 */
export interface ReturnDoc {
  /** Return type */
  type: string;
  /** Return description */
  description?: string;
}

/**
 * Single API entry (function, class, interface, etc.)
 */
export interface APIEntry {
  /** Entry type */
  kind: APIEntryKind;
  /** Export name */
  name: string;
  /** Full TypeScript signature */
  signature: string;
  /** Description from JSDoc or AI */
  description?: string;
  /** Parameter documentation */
  params?: ParamDoc[];
  /** Return value documentation */
  returns?: ReturnDoc;
  /** Usage examples */
  examples?: string[];
  /** Whether this is a default export */
  isDefault?: boolean;
  /** Source file path */
  sourceFile?: string;
  /** Line number in source */
  line?: number;
  /** Whether deprecated */
  deprecated?: string | boolean;
  /** Since version */
  since?: string;
  /** See also references */
  see?: string[];
  /** Generic type parameters */
  typeParams?: string[];
  /** For classes: methods */
  methods?: APIEntry[];
  /** For classes: properties */
  properties?: APIEntry[];
  /** For classes/interfaces: extends */
  extends?: string[];
  /** For classes: implements */
  implements?: string[];
  /** For enums: members */
  members?: Array<{ name: string; value?: string | number }>;
}

// ============================================================================
// Parsed Content Types
// ============================================================================

/**
 * Parsed README content
 */
export interface ParsedReadme {
  /** Package title */
  title?: string;
  /** Package description */
  description?: string;
  /** Badges found */
  badges?: string[];
  /** Installation instructions */
  installation?: string;
  /** Quick start guide */
  quickStart?: string;
  /** Usage examples */
  examples?: string[];
  /** API section content */
  api?: string;
  /** All sections */
  sections: Array<{
    title: string;
    content: string;
    level: number;
  }>;
}

/**
 * Parsed changelog entry
 */
export interface ChangelogEntry {
  /** Version */
  version: string;
  /** Release date */
  date?: string;
  /** Changes */
  changes: Array<{
    type: 'added' | 'changed' | 'deprecated' | 'removed' | 'fixed' | 'security' | 'other';
    description: string;
  }>;
}

/**
 * Parsed changelog content
 */
export interface ParsedChangelog {
  /** All versions */
  versions: ChangelogEntry[];
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Shared context object that flows through all processing stages
 */
export interface ExtractorContext {
  /** Package info */
  package: PackageInfo;

  /** Parsed API entries */
  api: APIEntry[];

  /** Parsed README */
  readme?: ParsedReadme;

  /** Parsed changelog */
  changelog?: ParsedChangelog;

  /** Extract options */
  options: ExtractOptions;

  /** Generated outputs by format (supports custom formats from plugins) */
  outputs: Map<OutputFormat | string, string>;

  /** Token count for llms.txt */
  tokenCount: number;

  /** Whether content was truncated */
  truncated: boolean;

  /** Start time for duration calculation */
  startTime: number;

  /** Whether loaded from cache */
  fromCache: boolean;

  /** Errors that occurred during processing */
  errors: Error[];
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of package extraction
 */
export interface ExtractResult {
  /** Package metadata */
  package: PackageMetadata;
  /** Parsed API entries */
  api: APIEntry[];
  /** Generated outputs by format */
  outputs: Record<string, string>;
  /** Token count for llms.txt */
  tokenCount: number;
  /** Whether content was truncated */
  truncated: boolean;
  /** Extraction duration in ms */
  duration: number;
  /** Cache status */
  fromCache: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Number of cached entries */
  entries: number;
  /** Total cache size in bytes */
  size: number;
  /** Cache directory path */
  dir: string;
}

// ============================================================================
// Extractor Interface
// ============================================================================

/**
 * Main extractor interface
 */
export interface Extractor {
  /** Extract documentation from a package */
  extract(packageSpec: string, options?: ExtractOptions): Promise<ExtractResult>;

  /** Fetch package without extraction */
  fetch(packageSpec: string): Promise<PackageInfo>;

  /** Register a plugin */
  use(plugin: Plugin): this;

  /** Unregister a plugin */
  unregister(name: string): boolean;

  /** List all registered plugins */
  listPlugins(): PluginInfo[];

  /** Clear cache */
  clearCache(): Promise<void>;

  /** Get cache stats */
  getCacheStats(): Promise<CacheStats>;
}

// ============================================================================
// AI Types
// ============================================================================

/**
 * Completion options for AI providers
 */
export interface CompletionOptions {
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for randomness */
  temperature?: number;
  /** System prompt */
  systemPrompt?: string;
}

/**
 * AI provider interface
 */
export interface AIProvider {
  /** Provider name */
  name: string;

  /** Check if provider is available */
  isAvailable(): boolean;

  /** Complete a prompt */
  complete(prompt: string, options?: CompletionOptions): Promise<string>;
}

// ============================================================================
// Tar Types
// ============================================================================

/**
 * Tar entry
 */
export interface TarEntry {
  /** File path */
  path: string;
  /** File content */
  content: string;
  /** File size */
  size: number;
  /** File type */
  type: 'file' | 'directory' | 'symlink';
}

/**
 * Tar header
 */
export interface TarHeader {
  /** File name */
  name: string;
  /** File mode */
  mode: number;
  /** User ID */
  uid: number;
  /** Group ID */
  gid: number;
  /** File size */
  size: number;
  /** Modification time */
  mtime: number;
  /** Checksum */
  checksum: number;
  /** File type */
  type: string;
  /** Link name */
  linkname: string;
}

// ============================================================================
// JSDoc Types
// ============================================================================

/**
 * Parsed JSDoc comment
 */
export interface JSDocParsed {
  /** Description */
  description?: string;
  /** Parameters */
  params: Array<{
    name: string;
    type?: string;
    description?: string;
    optional?: boolean;
    defaultValue?: string;
  }>;
  /** Return type */
  returns?: {
    type?: string;
    description?: string;
  };
  /** Examples */
  examples: string[];
  /** Deprecated notice */
  deprecated?: string;
  /** Since version */
  since?: string;
  /** See references */
  see: string[];
  /** Throws documentation */
  throws: Array<{
    type?: string;
    description?: string;
  }>;
  /** Type parameters */
  typeParams: Array<{
    name: string;
    description?: string;
  }>;
}
