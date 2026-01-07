/**
 * Ollama Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOllamaProvider,
  createOllamaPlugin,
  checkOllamaAvailable,
  listOllamaModels,
} from '../../../src/plugins/optional/ollama-ai.js';

describe('createOllamaProvider', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true by default (optimistic)', () => {
      const provider = createOllamaProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('complete', () => {
    it('should make correct API request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          model: 'llama3.2',
          created_at: '2024-01-01T00:00:00Z',
          response: 'Generated response',
          done: true,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOllamaProvider();
      const result = await provider.complete('test prompt', {
        maxTokens: 500,
        temperature: 0.7,
      });

      expect(result).toBe('Generated response');
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('llama3.2');
      expect(requestBody.prompt).toBe('test prompt');
      expect(requestBody.stream).toBe(false);
      expect(requestBody.options.num_predict).toBe(500);
      expect(requestBody.options.temperature).toBe(0.7);
    });

    it('should use custom model when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: 'Response',
          done: true,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOllamaProvider({ model: 'mistral' });
      await provider.complete('test prompt');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('mistral');
    });

    it('should use custom baseUrl when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: 'Response',
          done: true,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOllamaProvider({ baseUrl: 'http://remote-ollama:11434' });
      await provider.complete('test prompt');

      expect(fetch).toHaveBeenCalledWith(
        'http://remote-ollama:11434/api/generate',
        expect.anything()
      );
    });

    it('should include system prompt when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: 'Response',
          done: true,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOllamaProvider();
      await provider.complete('test prompt', { systemPrompt: 'You are helpful' });

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.system).toBe('You are helpful');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Model not found'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOllamaProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Ollama API error: 500 Internal Server Error'
      );
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: '',
          done: true,
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOllamaProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'No response from Ollama'
      );
    });

    it('should handle timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      const provider = createOllamaProvider({ timeout: 1000 });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Ollama request timed out'
      );
    });

    it('should handle connection refused (Ollama not running)', async () => {
      const connectionError = new Error('fetch failed');
      connectionError.message = 'connect ECONNREFUSED 127.0.0.1:11434';

      global.fetch = vi.fn().mockRejectedValue(connectionError);

      const provider = createOllamaProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Ollama is not running'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const provider = createOllamaProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Ollama request failed: Network error'
      );
    });
  });
});

describe('createOllamaPlugin', () => {
  it('should create a plugin with ollama enrichment', () => {
    const plugin = createOllamaPlugin();

    expect(plugin.name).toBe('ai-enrichment-ollama');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('ai');
  });

  it('should have install function', () => {
    const plugin = createOllamaPlugin();
    expect(typeof plugin.install).toBe('function');
  });

  it('should accept custom config', () => {
    const plugin = createOllamaPlugin({
      model: 'codellama',
      baseUrl: 'http://custom:11434',
    });

    expect(plugin.name).toBe('ai-enrichment-ollama');
  });
});

describe('checkOllamaAvailable', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when Ollama is running', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ models: [] }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await checkOllamaAvailable();

    expect(result).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/tags',
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('should return false when Ollama is not running', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const result = await checkOllamaAvailable();

    expect(result).toBe(false);
  });

  it('should return false when API returns error', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await checkOllamaAvailable();

    expect(result).toBe(false);
  });

  it('should use custom baseUrl when provided', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ models: [] }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await checkOllamaAvailable('http://custom:11434');

    expect(fetch).toHaveBeenCalledWith(
      'http://custom:11434/api/tags',
      expect.anything()
    );
  });
});

describe('listOllamaModels', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return list of models', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        models: [{ name: 'llama3.2' }, { name: 'mistral' }, { name: 'codellama' }],
      }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await listOllamaModels();

    expect(result).toEqual(['llama3.2', 'mistral', 'codellama']);
  });

  it('should return empty array when Ollama is not running', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

    const result = await listOllamaModels();

    expect(result).toEqual([]);
  });

  it('should return empty array when API returns error', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await listOllamaModels();

    expect(result).toEqual([]);
  });

  it('should use custom baseUrl when provided', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ models: [] }),
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await listOllamaModels('http://remote:11434');

    expect(fetch).toHaveBeenCalledWith(
      'http://remote:11434/api/tags',
      expect.anything()
    );
  });
});
