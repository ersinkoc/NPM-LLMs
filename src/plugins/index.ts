/**
 * Plugin exports for @oxog/npm-llms
 * @module plugins
 */

// Re-export core plugins
export * from './core/index.js';

// Re-export optional plugins (AI providers)
export * from './optional/index.js';

// Re-export types for plugin authors
export type {
  Plugin,
  PluginCategory,
  PluginInfo,
  EventHandler,
  Kernel,
  ExtractorContext,
  AIProvider,
  CompletionOptions,
} from '../types.js';

// Re-export kernel utilities
export { createKernel, definePlugin, composePlugins } from '../kernel.js';
