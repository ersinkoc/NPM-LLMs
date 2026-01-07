/**
 * AI Base Plugin Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createAIEnrichmentPlugin,
  createSimpleProvider,
  type AIEnrichmentOptions,
} from '../../../src/plugins/optional/ai-base.js';
import type { AIProvider, ExtractorContext, APIEntry } from '../../../src/types.js';

describe('createSimpleProvider', () => {
  it('should create a provider with default availability', () => {
    const completeFn = vi.fn().mockResolvedValue('test response');
    const provider = createSimpleProvider('test', completeFn);

    expect(provider.name).toBe('test');
    expect(provider.isAvailable()).toBe(true);
  });

  it('should create a provider with custom availability', () => {
    const completeFn = vi.fn().mockResolvedValue('test response');
    const provider = createSimpleProvider('test', completeFn, () => false);

    expect(provider.isAvailable()).toBe(false);
  });

  it('should call the completion function', async () => {
    const completeFn = vi.fn().mockResolvedValue('generated text');
    const provider = createSimpleProvider('test', completeFn);

    const result = await provider.complete('test prompt', { maxTokens: 100 });

    expect(result).toBe('generated text');
    expect(completeFn).toHaveBeenCalledWith('test prompt', { maxTokens: 100 });
  });
});

describe('createAIEnrichmentPlugin', () => {
  let mockProvider: AIProvider;
  let mockContext: ExtractorContext;

  beforeEach(() => {
    mockProvider = {
      name: 'mock',
      isAvailable: vi.fn().mockReturnValue(true),
      complete: vi.fn().mockResolvedValue('Generated description'),
    };

    mockContext = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map(),
      },
      api: [],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };
  });

  it('should create a plugin with correct name', () => {
    const plugin = createAIEnrichmentPlugin(mockProvider);

    expect(plugin.name).toBe('ai-enrichment-mock');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('ai');
  });

  it('should have an install function', () => {
    const plugin = createAIEnrichmentPlugin(mockProvider);

    expect(typeof plugin.install).toBe('function');
  });

  it('should register ai:enrich event handler', () => {
    const plugin = createAIEnrichmentPlugin(mockProvider);
    const mockKernel = {
      on: vi.fn(),
      emit: vi.fn(),
    };

    plugin.install(mockKernel as any);

    expect(mockKernel.on).toHaveBeenCalledWith('ai:enrich', expect.any(Function));
  });

  it('should throw error when provider is not available', async () => {
    mockProvider.isAvailable = vi.fn().mockReturnValue(false);
    const plugin = createAIEnrichmentPlugin(mockProvider);

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);

    await expect(handler!(mockContext)).rejects.toThrow('AI provider mock is not available');
  });

  it('should enrich entries without descriptions', async () => {
    const entry: APIEntry = {
      kind: 'function',
      name: 'testFunc',
      signature: 'function testFunc(): void',
    };
    mockContext.api = [entry];

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['descriptions'],
      skipExisting: true,
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockProvider.complete).toHaveBeenCalled();
    expect(entry.description).toBe('Generated description');
  });

  it('should skip entries with existing descriptions when skipExisting is true', async () => {
    const entry: APIEntry = {
      kind: 'function',
      name: 'testFunc',
      signature: 'function testFunc(): void',
      description: 'Existing description',
    };
    mockContext.api = [entry];

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['descriptions'],
      skipExisting: true,
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockProvider.complete).not.toHaveBeenCalled();
    expect(entry.description).toBe('Existing description');
  });

  it('should generate examples when task includes examples', async () => {
    mockProvider.complete = vi.fn().mockResolvedValue('```typescript\nconst x = 1;\n```');

    const entry: APIEntry = {
      kind: 'function',
      name: 'testFunc',
      signature: 'function testFunc(): void',
    };
    mockContext.api = [entry];

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['examples'],
      skipExisting: true,
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(entry.examples).toEqual(['const x = 1;']);
  });

  it('should only enrich functions and classes', async () => {
    const entries: APIEntry[] = [
      { kind: 'function', name: 'func1', signature: 'function func1(): void' },
      { kind: 'class', name: 'Class1', signature: 'class Class1' },
      { kind: 'interface', name: 'Interface1', signature: 'interface Interface1' },
      { kind: 'type', name: 'Type1', signature: 'type Type1' },
      { kind: 'constant', name: 'CONST1', signature: 'const CONST1' },
    ];
    mockContext.api = entries;

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['descriptions'],
      skipExisting: true,
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    // Should only be called for function and class (2 times)
    expect(mockProvider.complete).toHaveBeenCalledTimes(2);
  });

  it('should process entries in batches', async () => {
    const entries: APIEntry[] = Array.from({ length: 12 }, (_, i) => ({
      kind: 'function' as const,
      name: `func${i}`,
      signature: `function func${i}(): void`,
    }));
    mockContext.api = entries;

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['descriptions'],
      batchSize: 5,
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockProvider.complete).toHaveBeenCalledTimes(12);
  });

  it('should handle errors in individual entries gracefully', async () => {
    mockProvider.complete = vi
      .fn()
      .mockResolvedValueOnce('Description 1')
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce('Description 3');

    const entries: APIEntry[] = [
      { kind: 'function', name: 'func1', signature: 'function func1(): void' },
      { kind: 'function', name: 'func2', signature: 'function func2(): void' },
      { kind: 'function', name: 'func3', signature: 'function func3(): void' },
    ];
    mockContext.api = entries;

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['descriptions'],
      batchSize: 10,
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(entries[0].description).toBe('Description 1');
    expect(entries[1].description).toBeUndefined();
    expect(entries[2].description).toBe('Description 3');
    expect(mockContext.errors).toHaveLength(1);
  });

  it('should generate summary when task includes summary', async () => {
    mockProvider.complete = vi.fn().mockResolvedValue('Package summary text');
    mockContext.readme = {
      title: 'Test',
      sections: [],
      badges: [],
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['summary'],
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockContext.readme.description).toBe('Package summary text');
  });

  it('should not overwrite existing readme description', async () => {
    mockProvider.complete = vi.fn().mockResolvedValue('New summary');
    mockContext.readme = {
      title: 'Test',
      description: 'Existing description',
      sections: [],
      badges: [],
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['summary'],
    });

    let handler: Function;
    const mockKernel = {
      on: vi.fn((event, fn) => {
        handler = fn;
      }),
    };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockContext.readme.description).toBe('Existing description');
  });
});

describe('Response parsing', () => {
  it('should extract code blocks from example responses', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockResolvedValue(`
Here's an example:

\`\`\`typescript
const result = myFunc();
console.log(result);
\`\`\`

And another:

\`\`\`js
myFunc('arg');
\`\`\`
      `),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(): void',
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [entry],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['examples'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(entry.examples).toHaveLength(2);
    expect(entry.examples![0]).toContain('const result = myFunc()');
    expect(entry.examples![1]).toContain("myFunc('arg')");
  });

  it('should clean description responses', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockResolvedValue('Description: "A function that does something"'),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(): void',
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [entry],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['descriptions'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(entry.description).toBe('A function that does something');
  });
});
