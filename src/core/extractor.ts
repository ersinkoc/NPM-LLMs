/**
 * Main extractor implementation
 * Ties together fetching, parsing, and output generation
 * @module core/extractor
 */

import type {
  Extractor,
  ExtractorOptions,
  ExtractOptions,
  ExtractResult,
  ExtractorContext,
  PackageInfo,
  Plugin,
  PluginInfo,
  CacheStats,
  OutputFormat,
} from '../types.js';
import { createKernel } from '../kernel.js';
import { FileCache, createCache, buildPackageCacheKey } from './cache.js';
import { fetchPackage, parsePackageSpec } from './fetcher.js';
import { corePlugins } from '../plugins/core/index.js';

/**
 * Default output formats
 */
const DEFAULT_FORMATS: OutputFormat[] = ['llms', 'llms-full', 'markdown', 'json'];

/**
 * Create a new extractor instance
 * @param options - Extractor configuration options
 * @returns Extractor instance
 * @example
 * ```typescript
 * const extractor = createExtractor();
 * const result = await extractor.extract('lodash@4.17.21');
 * console.log(result.outputs.llms);
 * ```
 */
export function createExtractor(options: ExtractorOptions = {}): Extractor {
  // Create kernel
  const kernel = createKernel<ExtractorContext>();

  // Create cache
  const cache = createCache(options.cache);

  // Register core plugins
  for (const plugin of corePlugins) {
    kernel.use(plugin);
  }

  // Register additional plugins
  if (options.plugins) {
    for (const plugin of options.plugins) {
      kernel.use(plugin);
    }
  }

  /**
   * Extract documentation from a package
   */
  async function extract(
    packageSpec: string,
    extractOptions: ExtractOptions = {}
  ): Promise<ExtractResult> {
    const startTime = Date.now();

    // Parse package spec
    const { name, version } = parsePackageSpec(packageSpec);

    // Check cache
    const cacheKey = buildPackageCacheKey(name, version ?? 'latest', 'result');
    let fromCache = false;

    if (cache && !extractOptions.ignoreCache) {
      const cached = await cache.get<ExtractResult>(cacheKey);
      if (cached) {
        return {
          ...cached,
          fromCache: true,
        };
      }
    }

    // Fetch package
    const pkg = await fetchPackage(packageSpec, {
      registry: options.registry,
      timeout: options.ai?.timeout,
    });

    // Create context
    const context = createContext(pkg, extractOptions);

    // Emit events for processing
    await kernel.emit('package:fetched', context);
    await kernel.emit('parse:start', context);
    await kernel.emit('parse:complete', context);

    // AI enrichment if enabled
    if (extractOptions.enrichWithAI && options.ai) {
      await kernel.emit('enrich:start', context);
      await kernel.emit('enrich:complete', context);
    }

    // Generate outputs
    await kernel.emit('output:start', context);
    await kernel.emit('output:complete', context);

    // Build result
    const result: ExtractResult = {
      package: {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        tarball: pkg.tarball,
        types: pkg.types,
        main: pkg.main,
        exports: pkg.exports,
        repository: pkg.repository,
        keywords: pkg.keywords,
        author: pkg.author,
        license: pkg.license,
        homepage: pkg.homepage,
      },
      api: context.api,
      outputs: Object.fromEntries(context.outputs),
      tokenCount: context.tokenCount,
      truncated: context.truncated,
      duration: Date.now() - startTime,
      fromCache,
    };

    // Cache result
    if (cache && !extractOptions.ignoreCache) {
      await cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Fetch package without extraction
   */
  async function fetchOnly(packageSpec: string): Promise<PackageInfo> {
    return fetchPackage(packageSpec, {
      registry: options.registry,
    });
  }

  /**
   * Register a plugin
   */
  function use(plugin: Plugin): Extractor {
    kernel.use(plugin);
    return extractor;
  }

  /**
   * Unregister a plugin
   */
  function unregister(name: string): boolean {
    return kernel.unregister(name);
  }

  /**
   * List all registered plugins
   */
  function listPlugins(): PluginInfo[] {
    return kernel.listPlugins();
  }

  /**
   * Clear cache
   */
  async function clearCache(): Promise<void> {
    if (cache) {
      await cache.clear();
    }
  }

  /**
   * Get cache stats
   */
  async function getCacheStats(): Promise<CacheStats> {
    if (cache) {
      return cache.getStats();
    }
    return { entries: 0, size: 0, dir: '' };
  }

  const extractor: Extractor = {
    extract,
    fetch: fetchOnly,
    use,
    unregister,
    listPlugins,
    clearCache,
    getCacheStats,
  };

  return extractor;
}

/**
 * Create an extractor context
 */
function createContext(pkg: PackageInfo, options: ExtractOptions): ExtractorContext {
  return {
    package: pkg,
    api: [],
    readme: undefined,
    changelog: undefined,
    options: {
      formats: options.formats ?? DEFAULT_FORMATS,
      enrichWithAI: options.enrichWithAI ?? false,
      aiTasks: options.aiTasks ?? ['descriptions', 'examples', 'summary'],
      llmsTokenLimit: options.llmsTokenLimit ?? 2000,
      prioritize: options.prioritize ?? ['functions', 'examples'],
      ignoreCache: options.ignoreCache ?? false,
    },
    outputs: new Map(),
    tokenCount: 0,
    truncated: false,
    startTime: Date.now(),
    fromCache: false,
    errors: [],
  };
}

/**
 * Quick extract function for simple use cases
 * @param packageSpec - Package specifier
 * @param options - Extract options
 * @returns Extract result
 * @example
 * ```typescript
 * const result = await extract('lodash');
 * console.log(result.outputs.llms);
 * ```
 */
export async function extract(
  packageSpec: string,
  options?: ExtractOptions
): Promise<ExtractResult> {
  const extractor = createExtractor();
  return extractor.extract(packageSpec, options);
}
