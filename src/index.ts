/**
 * @oxog/npm-llms - Extract LLM-optimized documentation from NPM packages
 * @module @oxog/npm-llms
 */

// ============================================================================
// Types - Export all type definitions
// ============================================================================
export type {
  // Plugin types
  Plugin,
  PluginCategory,
  PluginInfo,
  EventHandler,
  Kernel,

  // Configuration types
  CacheOptions,
  AIProviderName,
  AIProviderOptions,
  ExtractorOptions,

  // Extract types
  OutputFormat,
  AITask,
  ContentPriority,
  ExtractOptions,

  // Package types
  PackageMetadata,
  PackageInfo,

  // API types
  APIEntryKind,
  ParamDoc,
  ReturnDoc,
  APIEntry,

  // Parsed content types
  ParsedReadme,
  ChangelogEntry,
  ParsedChangelog,

  // Context and result types
  ExtractorContext,
  ExtractResult,
  CacheStats,

  // Main interface
  Extractor,

  // AI types
  CompletionOptions,
  AIProvider,

  // Tar types
  TarEntry,
  TarHeader,

  // JSDoc types
  JSDocParsed,
} from './types.js';

// ============================================================================
// Errors - Export all error classes and utilities
// ============================================================================
export {
  // Base error
  NpmLlmsError,

  // Specific errors
  PackageNotFoundError,
  VersionNotFoundError,
  DownloadError,
  ParseError,
  AIError,
  PluginError,
  CacheError,
  ConfigError,
  TarError,
  TimeoutError,
  ValidationError,

  // Error utilities
  isNpmLlmsError,
  getErrorCode,
  wrapError,
} from './errors.js';

// ============================================================================
// Core - Main functionality
// ============================================================================
export { createExtractor, extract } from './core/extractor.js';
export { createKernel, definePlugin, composePlugins } from './kernel.js';

// ============================================================================
// Cache
// ============================================================================
export { FileCache, createCache, formatBytes } from './core/cache.js';

// ============================================================================
// Utilities
// ============================================================================
export { countTokens, truncateToTokenLimit, formatTokenCount } from './core/tokens.js';
export { fetchPackage, fetchPackageMetadata, parsePackageSpec, validatePackageName } from './core/fetcher.js';
