/**
 * OpenAI Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createOpenAIProvider,
  createOpenAIPlugin,
  createXAIProvider,
  createZAIProvider,
  createTogetherProvider,
  createPerplexityProvider,
  createOpenRouterProvider,
  createDeepSeekProvider,
  createMistralProvider,
  OPENAI_COMPATIBLE_PRESETS,
} from '../../../src/plugins/optional/openai-ai.js';

describe('createOpenAIProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return false when no API key is provided', () => {
      const provider = createOpenAIProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('should return true when API key is provided in config', () => {
      const provider = createOpenAIProvider({ apiKey: 'sk-test-key' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return true when API key is in environment', () => {
      process.env.OPENAI_API_KEY = 'sk-env-key';
      const provider = createOpenAIProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('complete', () => {
    it('should throw error when API key is not set', async () => {
      const provider = createOpenAIProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow('OPENAI_API_KEY not set');
    });

    it('should make correct API request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1234567890,
          model: 'gpt-4.1-nano',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Generated response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'sk-test-key' });
      const result = await provider.complete('test prompt', {
        maxTokens: 500,
        temperature: 0.7,
        systemPrompt: 'You are helpful',
      });

      expect(result).toBe('Generated response');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer sk-test-key',
          }),
        })
      );

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('gpt-4.1-nano');
      expect(requestBody.max_tokens).toBe(500);
      expect(requestBody.temperature).toBe(0.7);
      expect(requestBody.messages).toEqual([
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'test prompt' },
      ]);
    });

    it('should use custom model when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({
        apiKey: 'sk-test-key',
        model: 'gpt-4-turbo',
      });
      await provider.complete('test prompt');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('gpt-4-turbo');
    });

    it('should include organization header when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({
        apiKey: 'sk-test-key',
        organization: 'org-123',
      });
      await provider.complete('test prompt');

      const headers = (fetch as any).mock.calls[0][1].headers;
      expect(headers['OpenAI-Organization']).toBe('org-123');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'invalid-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'openai API error: 401 Unauthorized'
      );
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'sk-test-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'No content in openai response'
      );
    });

    it('should handle timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      const provider = createOpenAIProvider({
        apiKey: 'sk-test-key',
        timeout: 1000,
      });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'openai API request timed out'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const provider = createOpenAIProvider({ apiKey: 'sk-test-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'openai API request failed: Network error'
      );
    });

    it('should not include system message when systemPrompt is not provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'sk-test-key' });
      await provider.complete('test prompt');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.messages).toEqual([
        { role: 'user', content: 'test prompt' },
      ]);
    });
  });
});

describe('createOpenAIPlugin', () => {
  it('should create a plugin with openai enrichment', () => {
    const plugin = createOpenAIPlugin({ apiKey: 'sk-test-key' });

    expect(plugin.name).toBe('ai-enrichment-openai');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('ai');
  });

  it('should have install function', () => {
    const plugin = createOpenAIPlugin({ apiKey: 'sk-test-key' });
    expect(typeof plugin.install).toBe('function');
  });
});

describe('OpenAI-compatible presets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear all related env vars
    delete process.env.OPENAI_API_KEY;
    delete process.env.XAI_API_KEY;
    delete process.env.ZAI_API_KEY;
    delete process.env.TOGETHER_API_KEY;
    delete process.env.PERPLEXITY_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.MISTRAL_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('OPENAI_COMPATIBLE_PRESETS', () => {
    it('should have all expected presets', () => {
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('openai');
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('xai');
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('zai');
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('together');
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('perplexity');
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('openrouter');
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('deepseek');
      expect(OPENAI_COMPATIBLE_PRESETS).toHaveProperty('mistral');
    });

    it('each preset should have required fields', () => {
      for (const [key, preset] of Object.entries(OPENAI_COMPATIBLE_PRESETS)) {
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('baseUrl');
        expect(preset).toHaveProperty('envKey');
        expect(preset).toHaveProperty('defaultModel');
        expect(preset.name).toBe(key);
      }
    });
  });

  describe('preset configuration', () => {
    it('should use xai preset correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'xai-key', preset: 'xai' });
      expect(provider.name).toBe('xai');

      await provider.complete('test');
      const url = (fetch as any).mock.calls[0][0];
      expect(url).toContain('api.x.ai');
    });

    it('should use zai preset correctly', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'zai-key', preset: 'zai' });
      expect(provider.name).toBe('zai');

      await provider.complete('test');
      const url = (fetch as any).mock.calls[0][0];
      expect(url).toContain('api.z.ai');
    });

    it('should use preset env var when apiKey not provided', () => {
      process.env.XAI_API_KEY = 'env-xai-key';
      const provider = createOpenAIProvider({ preset: 'xai' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('should use preset default model', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'test-key', preset: 'deepseek' });
      await provider.complete('test');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('deepseek-chat');
    });

    it('should allow overriding preset model', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({
        apiKey: 'test-key',
        preset: 'deepseek',
        model: 'deepseek-coder',
      });
      await provider.complete('test');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('deepseek-coder');
    });
  });

  describe('helper functions', () => {
    it('createXAIProvider should use xai preset', () => {
      process.env.XAI_API_KEY = 'xai-key';
      const provider = createXAIProvider();
      expect(provider.name).toBe('xai');
      expect(provider.isAvailable()).toBe(true);
    });

    it('createZAIProvider should use zai preset', () => {
      process.env.ZAI_API_KEY = 'zai-key';
      const provider = createZAIProvider();
      expect(provider.name).toBe('zai');
      expect(provider.isAvailable()).toBe(true);
    });

    it('createTogetherProvider should use together preset', () => {
      process.env.TOGETHER_API_KEY = 'together-key';
      const provider = createTogetherProvider();
      expect(provider.name).toBe('together');
      expect(provider.isAvailable()).toBe(true);
    });

    it('createPerplexityProvider should use perplexity preset', () => {
      process.env.PERPLEXITY_API_KEY = 'pplx-key';
      const provider = createPerplexityProvider();
      expect(provider.name).toBe('perplexity');
      expect(provider.isAvailable()).toBe(true);
    });

    it('createOpenRouterProvider should use openrouter preset', () => {
      process.env.OPENROUTER_API_KEY = 'or-key';
      const provider = createOpenRouterProvider();
      expect(provider.name).toBe('openrouter');
      expect(provider.isAvailable()).toBe(true);
    });

    it('createDeepSeekProvider should use deepseek preset', () => {
      process.env.DEEPSEEK_API_KEY = 'ds-key';
      const provider = createDeepSeekProvider();
      expect(provider.name).toBe('deepseek');
      expect(provider.isAvailable()).toBe(true);
    });

    it('createMistralProvider should use mistral preset', () => {
      process.env.MISTRAL_API_KEY = 'mistral-key';
      const provider = createMistralProvider();
      expect(provider.name).toBe('mistral');
      expect(provider.isAvailable()).toBe(true);
    });

    it('helper functions should accept config overrides', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createDeepSeekProvider({
        apiKey: 'custom-key',
        model: 'deepseek-coder',
        timeout: 60000,
      });

      await provider.complete('test');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('deepseek-coder');
    });
  });

  describe('error handling with presets', () => {
    it('should show correct env var in error message for preset', async () => {
      const provider = createOpenAIProvider({ preset: 'xai' });

      await expect(provider.complete('test')).rejects.toThrow('XAI_API_KEY not set');
    });

    it('should show correct provider name in API error for preset', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key'),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createOpenAIProvider({ apiKey: 'bad-key', preset: 'deepseek' });

      await expect(provider.complete('test')).rejects.toThrow('deepseek API error: 401');
    });
  });
});
