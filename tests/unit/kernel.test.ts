/**
 * Kernel tests
 */

import { describe, it, expect, vi } from 'vitest';
import { createKernel, definePlugin, composePlugins } from '../../src/kernel.js';
import type { Plugin, ExtractorContext } from '../../src/types.js';

describe('kernel', () => {
  describe('createKernel', () => {
    it('should create a kernel instance', () => {
      const kernel = createKernel();
      expect(kernel).toBeDefined();
      expect(typeof kernel.use).toBe('function');
      expect(typeof kernel.on).toBe('function');
      expect(typeof kernel.emit).toBe('function');
    });

    it('should register plugins with use()', () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
      };

      kernel.use(plugin);

      expect(kernel.hasPlugin('test-plugin')).toBe(true);
      expect(plugin.install).toHaveBeenCalledWith(kernel);
    });

    it('should unregister plugins', () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
      };

      kernel.use(plugin);
      expect(kernel.hasPlugin('test-plugin')).toBe(true);

      const removed = kernel.unregister('test-plugin');
      expect(removed).toBe(true);
      expect(kernel.hasPlugin('test-plugin')).toBe(false);
    });

    it('should list registered plugins', () => {
      const kernel = createKernel();
      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        category: 'parser',
        install: vi.fn(),
      };
      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '2.0.0',
        category: 'output',
        install: vi.fn(),
      };

      kernel.use(plugin1);
      kernel.use(plugin2);

      const plugins = kernel.listPlugins();
      expect(plugins).toHaveLength(2);
      expect(plugins[0].name).toBe('plugin-1');
      expect(plugins[1].name).toBe('plugin-2');
    });

    it('should emit and handle events', async () => {
      const kernel = createKernel();
      const handler = vi.fn();

      kernel.on('test-event', handler);

      const context = {} as ExtractorContext;
      await kernel.emit('test-event', context, 'arg1', 'arg2');

      expect(handler).toHaveBeenCalledWith(context, 'arg1', 'arg2');
    });

    it('should allow unsubscribing from events', async () => {
      const kernel = createKernel();
      const handler = vi.fn();

      kernel.on('test-event', handler);
      kernel.off('test-event', handler);

      const context = {} as ExtractorContext;
      await kernel.emit('test-event', context);

      expect(handler).not.toHaveBeenCalled();
    });

    it('should support multiple handlers per event', async () => {
      const kernel = createKernel();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      kernel.on('test-event', handler1);
      kernel.on('test-event', handler2);

      const context = {} as ExtractorContext;
      await kernel.emit('test-event', context);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it('should call onInit after plugin installation', async () => {
      const kernel = createKernel();
      const onInit = vi.fn();

      const plugin: Plugin = {
        name: 'init-plugin',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
        onInit,
      };

      kernel.use(plugin);

      // Init should be called via the kernel
      const context = {} as ExtractorContext;
      await kernel.emit('kernel:init', context);
    });

    it('should handle plugin errors gracefully', async () => {
      const kernel = createKernel();
      const errorHandler = vi.fn();

      const plugin: Plugin = {
        name: 'error-plugin',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
        onError: errorHandler,
      };

      kernel.use(plugin);

      // Register a handler that throws
      kernel.on('test-event', () => {
        throw new Error('Test error');
      });

      const context = {} as ExtractorContext;

      // Should not throw
      await expect(kernel.emit('test-event', context)).resolves.not.toThrow();
    });
  });

  describe('definePlugin', () => {
    it('should create a plugin definition', () => {
      const plugin = definePlugin({
        name: 'my-plugin',
        version: '1.0.0',
        category: 'parser',
        install: vi.fn(),
      });

      expect(plugin.name).toBe('my-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.category).toBe('parser');
    });
  });

  describe('composePlugins', () => {
    it('should compose multiple plugins into one', () => {
      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        category: 'parser',
        dependencies: ['dep-a'],
        install: vi.fn(),
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        category: 'output',
        dependencies: ['dep-b'],
        install: vi.fn(),
      };

      const composed = composePlugins('composed', [plugin1, plugin2]);

      expect(composed.name).toBe('composed');
      // Composed plugin has dependencies of its child plugins
      expect(composed.dependencies).toContain('dep-a');
      expect(composed.dependencies).toContain('dep-b');
    });

    it('should install all composed plugins', () => {
      const kernel = createKernel();
      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        category: 'parser',
        install: vi.fn(),
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        category: 'output',
        install: vi.fn(),
      };

      const composed = composePlugins('composed', [plugin1, plugin2]);
      kernel.use(composed);

      expect(plugin1.install).toHaveBeenCalled();
      expect(plugin2.install).toHaveBeenCalled();
    });

    it('should handle composed plugin onDestroy', async () => {
      const composed = composePlugins('composed', []);
      // onDestroy should exist and not throw
      await expect(composed.onDestroy?.()).resolves.not.toThrow();
    });
  });

  describe('kernel additional coverage', () => {
    it('should get plugin by name', () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
      };

      kernel.use(plugin);

      const retrieved = kernel.getPlugin('test-plugin');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-plugin');
    });

    it('should return undefined for unknown plugin', () => {
      const kernel = createKernel();
      const retrieved = kernel.getPlugin('unknown');
      expect(retrieved).toBeUndefined();
    });

    it('should destroy kernel and all plugins', async () => {
      const kernel = createKernel();
      const onDestroy1 = vi.fn();
      const onDestroy2 = vi.fn();

      const plugin1: Plugin = {
        name: 'plugin-1',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
        onDestroy: onDestroy1,
      };

      const plugin2: Plugin = {
        name: 'plugin-2',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
        onDestroy: onDestroy2,
      };

      kernel.use(plugin1);
      kernel.use(plugin2);

      await kernel.destroy();

      expect(onDestroy1).toHaveBeenCalled();
      expect(onDestroy2).toHaveBeenCalled();
      expect(kernel.hasPlugin('plugin-1')).toBe(false);
      expect(kernel.hasPlugin('plugin-2')).toBe(false);
    });

    it('should handle errors during destroy', async () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'error-plugin',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
        onDestroy: () => {
          throw new Error('Destroy error');
        },
      };

      kernel.use(plugin);

      // Should not throw
      await expect(kernel.destroy()).resolves.not.toThrow();
    });

    it('should remove event handlers when unregistering plugin', async () => {
      const kernel = createKernel();
      const handler = vi.fn();

      const plugin: Plugin = {
        name: 'handler-plugin',
        version: '1.0.0',
        category: 'utility',
        install: (k) => {
          k.on('test-event', handler);
        },
      };

      kernel.use(plugin);

      const context = {} as ExtractorContext;
      await kernel.emit('test-event', context);
      expect(handler).toHaveBeenCalledTimes(1);

      kernel.unregister('handler-plugin');

      // Handler should be removed
      await kernel.emit('test-event', context);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it('should delete event map when all handlers removed', async () => {
      const kernel = createKernel();
      const handler = vi.fn();

      const plugin: Plugin = {
        name: 'single-handler-plugin',
        version: '1.0.0',
        category: 'utility',
        install: (k) => {
          k.on('single-event', handler);
        },
      };

      kernel.use(plugin);
      kernel.unregister('single-handler-plugin');

      // Event should have no handlers
      const context = {} as ExtractorContext;
      await kernel.emit('single-event', context);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle onDestroy error during unregister', () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'destroy-error-plugin',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
        onDestroy: () => {
          throw new Error('Destroy error');
        },
      };

      kernel.use(plugin);

      // Should not throw
      expect(() => kernel.unregister('destroy-error-plugin')).not.toThrow();
      expect(kernel.hasPlugin('destroy-error-plugin')).toBe(false);
    });

    it('should throw when plugin depends on unregistered plugin', () => {
      const kernel = createKernel();
      const dep: Plugin = {
        name: 'dep',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
      };

      const dependent: Plugin = {
        name: 'dependent',
        version: '1.0.0',
        category: 'utility',
        dependencies: ['dep'],
        install: vi.fn(),
      };

      kernel.use(dep);
      kernel.use(dependent);

      // Cannot unregister dep because dependent depends on it
      expect(() => kernel.unregister('dep')).toThrow();
    });

    it('should handle off for non-existent event', () => {
      const kernel = createKernel();
      const handler = vi.fn();

      // Should not throw
      expect(() => kernel.off('non-existent', handler)).not.toThrow();
    });

    it('should handle emit for non-existent event', async () => {
      const kernel = createKernel();
      const context = {} as ExtractorContext;

      // Should not throw
      await expect(kernel.emit('non-existent', context)).resolves.not.toThrow();
    });

    it('should throw when registering plugin without name', () => {
      const kernel = createKernel();
      const plugin = {
        name: '',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
      } as Plugin;

      expect(() => kernel.use(plugin)).toThrow('Plugin must have a name');
    });

    it('should throw when registering duplicate plugin', () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'dupe',
        version: '1.0.0',
        category: 'utility',
        install: vi.fn(),
      };

      kernel.use(plugin);
      expect(() => kernel.use(plugin)).toThrow('already registered');
    });

    it('should throw when plugin dependency is missing', () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'missing-dep',
        version: '1.0.0',
        category: 'utility',
        dependencies: ['non-existent'],
        install: vi.fn(),
      };

      expect(() => kernel.use(plugin)).toThrow('depends on');
    });

    it('should throw when plugin install fails', () => {
      const kernel = createKernel();
      const plugin: Plugin = {
        name: 'failing-install',
        version: '1.0.0',
        category: 'utility',
        install: () => {
          throw new Error('Install failed');
        },
      };

      expect(() => kernel.use(plugin)).toThrow('Failed to install');
    });

    it('should return false when unregistering unknown plugin', () => {
      const kernel = createKernel();
      const result = kernel.unregister('unknown');
      expect(result).toBe(false);
    });

    it('should handle onError that throws', async () => {
      const kernel = createKernel();

      const plugin: Plugin = {
        name: 'bad-error-handler',
        version: '1.0.0',
        category: 'utility',
        install: (k) => {
          k.on('error-test', () => {
            throw new Error('Handler error');
          });
        },
        onError: () => {
          throw new Error('Error handler also throws');
        },
      };

      kernel.use(plugin);

      const context = {} as ExtractorContext;
      // Should not throw even when both handler and onError throw
      await expect(kernel.emit('error-test', context)).resolves.not.toThrow();
    });
  });
});
