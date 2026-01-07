/**
 * Groq Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGroqProvider, createGroqPlugin } from '../../../src/plugins/optional/groq-ai.js';

describe('createGroqProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GROQ_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return false when no API key is provided', () => {
      const provider = createGroqProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('should return true when API key is provided in config', () => {
      const provider = createGroqProvider({ apiKey: 'gsk_test_key' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return true when GROQ_API_KEY is in environment', () => {
      process.env.GROQ_API_KEY = 'gsk_env_key';
      const provider = createGroqProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('complete', () => {
    it('should throw error when API key is not set', async () => {
      const provider = createGroqProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow('GROQ_API_KEY not set');
    });

    it('should make correct API request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1234567890,
          model: 'llama-3.1-8b-instant',
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

      const provider = createGroqProvider({ apiKey: 'gsk_test_key' });
      const result = await provider.complete('test prompt', {
        maxTokens: 500,
        temperature: 0.7,
        systemPrompt: 'You are helpful',
      });

      expect(result).toBe('Generated response');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.groq.com/openai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer gsk_test_key',
          }),
        })
      );

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('llama-3.1-8b-instant');
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

      const provider = createGroqProvider({
        apiKey: 'gsk_test_key',
        model: 'mixtral-8x7b-32768',
      });
      await provider.complete('test prompt');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('mixtral-8x7b-32768');
    });

    it('should not include system message when systemPrompt is not provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGroqProvider({ apiKey: 'gsk_test_key' });
      await provider.complete('test prompt');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.messages).toEqual([{ role: 'user', content: 'test prompt' }]);
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGroqProvider({ apiKey: 'invalid-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Groq API error: 401 Unauthorized'
      );
    });

    it('should handle rate limit errors', async () => {
      const mockResponse = {
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: vi.fn().mockResolvedValue('Rate limit exceeded'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGroqProvider({ apiKey: 'gsk_test_key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Groq API error: 429 Too Many Requests'
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

      const provider = createGroqProvider({ apiKey: 'gsk_test_key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'No content in Groq response'
      );
    });

    it('should handle timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      const provider = createGroqProvider({
        apiKey: 'gsk_test_key',
        timeout: 1000,
      });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Groq API request timed out'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const provider = createGroqProvider({ apiKey: 'gsk_test_key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Groq API request failed: Network error'
      );
    });

    it('should use custom baseUrl when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Response' } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGroqProvider({
        apiKey: 'gsk_test_key',
        baseUrl: 'https://custom-api.example.com',
      });
      await provider.complete('test prompt');

      expect(fetch).toHaveBeenCalledWith(
        'https://custom-api.example.com/v1/chat/completions',
        expect.anything()
      );
    });
  });
});

describe('createGroqPlugin', () => {
  it('should create a plugin with groq enrichment', () => {
    const plugin = createGroqPlugin({ apiKey: 'gsk_test_key' });

    expect(plugin.name).toBe('ai-enrichment-groq');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('ai');
  });

  it('should have install function', () => {
    const plugin = createGroqPlugin({ apiKey: 'gsk_test_key' });
    expect(typeof plugin.install).toBe('function');
  });

  it('should work without API key in config (will use env)', () => {
    const plugin = createGroqPlugin();
    expect(plugin.name).toBe('ai-enrichment-groq');
  });
});
