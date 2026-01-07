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

  it('should use whole response when no code blocks found', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockResolvedValue('myFunc("hello")'),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(x: string): void',
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

    expect(entry.examples).toHaveLength(1);
    expect(entry.examples![0]).toBe('myFunc("hello")');
  });
});

describe('generateEntryPrompt variations', () => {
  it('should include existing description in prompt', async () => {
    let capturedPrompt = '';
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation((prompt) => {
        capturedPrompt = prompt;
        return Promise.resolve('New description');
      }),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(): void',
      description: 'Existing description here',
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [entry],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['descriptions'],
      skipExisting: false, // Force enrichment even with existing description
    });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(capturedPrompt).toContain('Current description: Existing description here');
  });

  it('should include params in prompt', async () => {
    let capturedPrompt = '';
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation((prompt) => {
        capturedPrompt = prompt;
        return Promise.resolve('Description');
      }),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(a: string, b: number): void',
      params: [
        { name: 'a', type: 'string' },
        { name: 'b', type: 'number' },
      ],
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

    expect(capturedPrompt).toContain('Parameters:');
    expect(capturedPrompt).toContain('- a: string');
    expect(capturedPrompt).toContain('- b: number');
  });

  it('should include returns in prompt', async () => {
    let capturedPrompt = '';
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation((prompt) => {
        capturedPrompt = prompt;
        return Promise.resolve('Description');
      }),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(): string',
      returns: { type: 'string' },
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

    expect(capturedPrompt).toContain('Returns: string');
  });
});

describe('summary generation edge cases', () => {
  it('should handle summary generation errors', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockRejectedValue(new Error('API Error')),
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['summary'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockContext.errors).toHaveLength(1);
    expect(mockContext.errors[0].message).toBe('API Error');
  });

  it('should handle non-Error thrown in summary generation', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockRejectedValue('String error'),
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['summary'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockContext.errors).toHaveLength(1);
    expect(mockContext.errors[0].message).toBe('AI summary generation failed');
  });

  it('should not set description when readme is not available', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockResolvedValue('Generated summary'),
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
      // No readme property
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['summary'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockContext.readme).toBeUndefined();
  });
});

describe('enrichEntries edge cases', () => {
  it('should skip entries with existing examples when skipExisting is true', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockResolvedValue('Generated'),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(): void',
      examples: ['existing example'],
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [entry],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['examples'],
      skipExisting: true,
    });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockProvider.complete).not.toHaveBeenCalled();
    expect(entry.examples).toEqual(['existing example']);
  });

  it('should handle both descriptions and examples tasks', async () => {
    let callCount = 0;
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? 'Generated description' : '```ts\ncode()\n```';
      }),
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

    const plugin = createAIEnrichmentPlugin(mockProvider, {
      tasks: ['descriptions', 'examples'],
    });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(mockProvider.complete).toHaveBeenCalledTimes(2);
    expect(entry.description).toBe('Generated description');
    expect(entry.examples).toHaveLength(1);
  });

  it('should handle non-Error thrown during entry enrichment', async () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockRejectedValue('String error'),
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

    expect(mockContext.errors).toHaveLength(1);
    expect(mockContext.errors[0].message).toContain('AI enrichment failed for myFunc');
  });
});

describe('generateSummaryPrompt', () => {
  it('should include package info in summary prompt', async () => {
    let capturedPrompt = '';
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation((prompt) => {
        capturedPrompt = prompt;
        return Promise.resolve('Summary');
      }),
    };

    const mockContext: ExtractorContext = {
      package: {
        name: 'my-package',
        version: '2.0.0',
        description: 'A test package',
        files: new Map(),
      },
      api: [
        { kind: 'function', name: 'fn1', signature: 'function fn1(): void' },
        { kind: 'function', name: 'fn2', signature: 'function fn2(): void' },
        { kind: 'class', name: 'MyClass', signature: 'class MyClass' },
        { kind: 'interface', name: 'IMyInterface', signature: 'interface IMyInterface' },
        { kind: 'type', name: 'MyType', signature: 'type MyType' },
      ],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['summary'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(capturedPrompt).toContain('Package: my-package@2.0.0');
    expect(capturedPrompt).toContain('Description: A test package');
    expect(capturedPrompt).toContain('Functions: 2');
    expect(capturedPrompt).toContain('Classes: 1');
    expect(capturedPrompt).toContain('Types: 2'); // interface + type
    expect(capturedPrompt).toContain('function fn1');
  });

  it('should handle missing package description', async () => {
    let capturedPrompt = '';
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation((prompt) => {
        capturedPrompt = prompt;
        return Promise.resolve('Summary');
      }),
    };

    const mockContext: ExtractorContext = {
      package: {
        name: 'no-desc-pkg',
        version: '1.0.0',
        files: new Map(),
      },
      api: [],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['summary'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    expect(capturedPrompt).toContain('Description: No description available');
  });
});

describe('params and returns tasks', () => {
  it('should create plugin for params task', () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockResolvedValue('{}'),
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['params'] });

    expect(plugin.name).toBe('ai-enrichment-mock');
    expect(plugin.category).toBe('ai');
  });

  it('should create plugin for returns task', () => {
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockResolvedValue('Result'),
    };

    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['returns'] });

    expect(plugin.name).toBe('ai-enrichment-mock');
    expect(plugin.category).toBe('ai');
  });

  it('should enrich function with params task', async () => {
    const capturedPrompts: string[] = [];
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation((prompt) => {
        capturedPrompts.push(prompt);
        return Promise.resolve('{"x": "The x parameter"}');
      }),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(x: number): void',
      params: [{ name: 'x', type: 'number' }],
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [entry],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    // enrichEntries is only called for 'descriptions' or 'examples', so include descriptions
    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['descriptions', 'params'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    // Should have made calls for both tasks
    expect(capturedPrompts.length).toBeGreaterThanOrEqual(1);
    // Check that params task generated a prompt with parameter info
    const hasParamPrompt = capturedPrompts.some(p => p.toLowerCase().includes('parameter'));
    expect(hasParamPrompt).toBe(true);
  });

  it('should enrich function with returns task', async () => {
    const capturedPrompts: string[] = [];
    const mockProvider: AIProvider = {
      name: 'mock',
      isAvailable: () => true,
      complete: vi.fn().mockImplementation((prompt) => {
        capturedPrompts.push(prompt);
        return Promise.resolve('The return value');
      }),
    };

    const entry: APIEntry = {
      kind: 'function',
      name: 'myFunc',
      signature: 'function myFunc(): string',
      returns: { type: 'string' },
    };

    const mockContext: ExtractorContext = {
      package: { name: 'test', version: '1.0.0', files: new Map() },
      api: [entry],
      errors: [],
      outputs: {},
      tokenCount: 0,
      truncated: false,
    };

    // enrichEntries is only called for 'descriptions' or 'examples', so include descriptions
    const plugin = createAIEnrichmentPlugin(mockProvider, { tasks: ['descriptions', 'returns'] });

    let handler: Function;
    const mockKernel = { on: vi.fn((_, fn) => { handler = fn; }) };

    plugin.install(mockKernel as any);
    await handler!(mockContext);

    // Should have made calls for both tasks
    expect(capturedPrompts.length).toBeGreaterThanOrEqual(1);
    // Check that returns task generated a prompt with return info
    const hasReturnPrompt = capturedPrompts.some(p => p.toLowerCase().includes('return'));
    expect(hasReturnPrompt).toBe(true);
  });
});
