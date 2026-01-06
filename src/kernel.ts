/**
 * Micro-kernel implementation for plugin management
 * Provides plugin registration, event bus, and error boundary
 * @module kernel
 */

import { PluginError } from './errors.js';
import type {
  Plugin,
  PluginInfo,
  EventHandler,
  Kernel,
  ExtractorContext,
} from './types.js';

/**
 * Internal event handler entry
 */
interface EventEntry<TContext> {
  handler: EventHandler<TContext>;
  pluginName: string;
}

/**
 * Create a new kernel instance
 * @returns Kernel instance
 * @example
 * ```typescript
 * const kernel = createKernel<MyContext>();
 * kernel.use(myPlugin);
 * await kernel.emit('event', context);
 * ```
 */
export function createKernel<TContext = ExtractorContext>(): Kernel<TContext> & {
  destroy(): Promise<void>;
} {
  const plugins = new Map<string, Plugin<TContext>>();
  const eventHandlers = new Map<string, Set<EventEntry<TContext>>>();
  const handlerToPlugin = new Map<EventHandler<TContext>, string>();

  /**
   * Handle plugin error
   */
  function handlePluginError(error: Error, pluginName?: string): void {
    const plugin = pluginName ? plugins.get(pluginName) : undefined;
    if (plugin?.onError) {
      try {
        plugin.onError(error);
      } catch {
        // Ignore errors in error handlers
      }
    }
  }

  /**
   * Register a plugin
   */
  function use(plugin: Plugin<TContext>): Kernel<TContext> {
    // Validate plugin
    if (!plugin.name) {
      throw new PluginError('Plugin must have a name');
    }

    if (plugins.has(plugin.name)) {
      throw new PluginError(`Plugin "${plugin.name}" is already registered`, plugin.name);
    }

    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!plugins.has(dep)) {
          throw new PluginError(
            `Plugin "${plugin.name}" depends on "${dep}" which is not registered`,
            plugin.name
          );
        }
      }
    }

    // Install plugin
    try {
      plugin.install(kernel);
      plugins.set(plugin.name, plugin);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new PluginError(
        `Failed to install plugin "${plugin.name}": ${err.message}`,
        plugin.name
      );
    }

    return kernel;
  }

  /**
   * Unregister a plugin
   */
  function unregister(name: string): boolean {
    const plugin = plugins.get(name);
    if (!plugin) {
      return false;
    }

    // Check if other plugins depend on this one
    for (const [, p] of plugins) {
      if (p.dependencies?.includes(name)) {
        throw new PluginError(
          `Cannot unregister "${name}": plugin "${p.name}" depends on it`,
          name
        );
      }
    }

    // Remove event handlers from this plugin
    for (const [event, handlers] of eventHandlers) {
      const toRemove: EventEntry<TContext>[] = [];
      for (const entry of handlers) {
        if (entry.pluginName === name) {
          toRemove.push(entry);
          handlerToPlugin.delete(entry.handler);
        }
      }
      for (const entry of toRemove) {
        handlers.delete(entry);
      }
      if (handlers.size === 0) {
        eventHandlers.delete(event);
      }
    }

    // Call destroy hook
    try {
      plugin.onDestroy?.();
    } catch {
      // Ignore errors in destroy
    }

    plugins.delete(name);
    return true;
  }

  /**
   * Subscribe to an event
   */
  function on(event: string, handler: EventHandler<TContext>): void {
    if (!eventHandlers.has(event)) {
      eventHandlers.set(event, new Set());
    }

    // Determine which plugin is registering this handler
    // (inferred from current install context)
    const pluginName = getCurrentPluginContext() ?? 'unknown';

    const entry: EventEntry<TContext> = { handler, pluginName };
    eventHandlers.get(event)!.add(entry);
    handlerToPlugin.set(handler, pluginName);
  }

  /**
   * Unsubscribe from an event
   */
  function off(event: string, handler: EventHandler<TContext>): void {
    const handlers = eventHandlers.get(event);
    if (!handlers) return;

    for (const entry of handlers) {
      if (entry.handler === handler) {
        handlers.delete(entry);
        handlerToPlugin.delete(handler);
        break;
      }
    }

    if (handlers.size === 0) {
      eventHandlers.delete(event);
    }
  }

  /**
   * Emit an event
   */
  async function emit(event: string, context: TContext, ...args: unknown[]): Promise<void> {
    const handlers = eventHandlers.get(event);
    if (!handlers || handlers.size === 0) return;

    // Process handlers sequentially
    for (const entry of handlers) {
      try {
        await entry.handler(context, ...args);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        handlePluginError(err, entry.pluginName);
        // Continue with other handlers
      }
    }
  }

  /**
   * List all plugins
   */
  function listPlugins(): PluginInfo[] {
    return Array.from(plugins.values()).map((p) => ({
      name: p.name,
      version: p.version,
      category: p.category,
      dependencies: p.dependencies ?? [],
    }));
  }

  /**
   * Get a plugin by name
   */
  function getPlugin(name: string): Plugin<TContext> | undefined {
    return plugins.get(name);
  }

  /**
   * Check if a plugin is registered
   */
  function hasPlugin(name: string): boolean {
    return plugins.has(name);
  }

  /**
   * Destroy the kernel and all plugins
   */
  async function destroy(): Promise<void> {
    // Destroy plugins in reverse order
    const pluginNames = Array.from(plugins.keys()).reverse();

    for (const name of pluginNames) {
      const plugin = plugins.get(name);
      if (plugin?.onDestroy) {
        try {
          await plugin.onDestroy();
        } catch {
          // Ignore errors during destroy
        }
      }
    }

    plugins.clear();
    eventHandlers.clear();
    handlerToPlugin.clear();
  }

  // Track which plugin is currently being installed
  let currentPluginContext: string | null = null;

  function getCurrentPluginContext(): string | null {
    return currentPluginContext;
  }

  // Wrap use to track plugin context
  const originalUse = use;
  function wrappedUse(plugin: Plugin<TContext>): Kernel<TContext> & { destroy(): Promise<void> } {
    currentPluginContext = plugin.name;
    try {
      originalUse(plugin);
      return kernel;
    } finally {
      currentPluginContext = null;
    }
  }

  const kernel: Kernel<TContext> & { destroy(): Promise<void> } = {
    use: wrappedUse,
    unregister,
    on,
    off,
    emit,
    listPlugins,
    getPlugin,
    hasPlugin,
    destroy,
  };

  return kernel;
}

/**
 * Create a plugin definition helper
 * @param definition - Plugin definition
 * @returns Plugin
 * @example
 * ```typescript
 * const myPlugin = definePlugin({
 *   name: 'my-plugin',
 *   version: '1.0.0',
 *   category: 'parser',
 *   install(kernel) {
 *     kernel.on('parse:start', (ctx) => {
 *       // Handle event
 *     });
 *   }
 * });
 * ```
 */
export function definePlugin<TContext = ExtractorContext>(
  definition: Plugin<TContext>
): Plugin<TContext> {
  return definition;
}

/**
 * Compose multiple plugins into a single plugin
 * @param name - Composed plugin name
 * @param plugins - Plugins to compose
 * @returns Composed plugin
 * @example
 * ```typescript
 * const allParsers = composePlugins('all-parsers', [
 *   dtsParser,
 *   tsParser,
 *   readmeParser,
 * ]);
 * ```
 */
export function composePlugins<TContext = ExtractorContext>(
  name: string,
  plugins: Plugin<TContext>[]
): Plugin<TContext> {
  return {
    name,
    version: '1.0.0',
    category: 'utility',
    dependencies: plugins.flatMap((p) => p.dependencies ?? []),

    install(kernel) {
      for (const plugin of plugins) {
        kernel.use(plugin);
      }
    },

    async onDestroy() {
      // Individual plugins handle their own cleanup
    },
  };
}
