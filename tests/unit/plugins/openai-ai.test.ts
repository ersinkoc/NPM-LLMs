/**
 * OpenAI Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createOpenAIProvider, createOpenAIPlugin } from '../../../src/plugins/optional/openai-ai.js';

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
          model: 'gpt-4o-mini',
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
      expect(requestBody.model).toBe('gpt-4o-mini');
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
        'OpenAI API error: 401 Unauthorized'
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
        'No content in OpenAI response'
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
        'OpenAI API request timed out'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const provider = createOpenAIProvider({ apiKey: 'sk-test-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'OpenAI API request failed: Network error'
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
