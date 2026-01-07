/**
 * Claude AI Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClaudeProvider, createClaudePlugin } from '../../../src/plugins/optional/claude-ai.js';

describe('createClaudeProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return false when no API key is provided', () => {
      const provider = createClaudeProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('should return true when API key is provided in config', () => {
      const provider = createClaudeProvider({ apiKey: 'test-key' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return true when API key is in environment', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';
      const provider = createClaudeProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    it('should prefer config API key over environment', () => {
      process.env.ANTHROPIC_API_KEY = 'env-key';
      const provider = createClaudeProvider({ apiKey: 'config-key' });
      expect(provider.isAvailable()).toBe(true);
      expect(provider.name).toBe('claude');
    });
  });

  describe('complete', () => {
    it('should throw error when API key is not set', async () => {
      const provider = createClaudeProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow('ANTHROPIC_API_KEY not set');
    });

    it('should make correct API request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          id: 'msg_123',
          type: 'message',
          role: 'assistant',
          content: [{ type: 'text', text: 'Generated response' }],
          model: 'claude-haiku-4-5-20251001',
          stop_reason: 'end_turn',
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createClaudeProvider({ apiKey: 'test-key' });
      const result = await provider.complete('test prompt', {
        maxTokens: 500,
        temperature: 0.5,
        systemPrompt: 'You are helpful',
      });

      expect(result).toBe('Generated response');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-key',
            'anthropic-version': '2023-06-01',
          }),
        })
      );

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('claude-haiku-4-5-20251001');
      expect(requestBody.max_tokens).toBe(500);
      expect(requestBody.temperature).toBe(0.5);
      expect(requestBody.system).toBe('You are helpful');
      expect(requestBody.messages).toEqual([{ role: 'user', content: 'test prompt' }]);
    });

    it('should use default values when options not provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createClaudeProvider({ apiKey: 'test-key' });
      await provider.complete('test prompt');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.max_tokens).toBe(1000);
      expect(requestBody.temperature).toBe(0.3);
      expect(requestBody.system).toBeUndefined();
    });

    it('should use custom model when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createClaudeProvider({
        apiKey: 'test-key',
        model: 'claude-3-opus-20240229',
      });
      await provider.complete('test prompt');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.model).toBe('claude-3-opus-20240229');
    });

    it('should use custom base URL when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Response' }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createClaudeProvider({
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
      });
      await provider.complete('test prompt');

      expect(fetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/messages',
        expect.anything()
      );
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: vi.fn().mockResolvedValue('Invalid API key'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createClaudeProvider({ apiKey: 'invalid-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Claude API error: 401 Unauthorized - Invalid API key'
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

      const provider = createClaudeProvider({ apiKey: 'test-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Claude API error: 429 Too Many Requests'
      );
    });

    it('should handle empty content response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          content: [{ type: 'image', data: 'base64...' }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createClaudeProvider({ apiKey: 'test-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'No text content in Claude response'
      );
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const provider = createClaudeProvider({ apiKey: 'test-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Claude API request failed: Network error'
      );
    });

    it('should handle timeout with AbortController', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      const provider = createClaudeProvider({
        apiKey: 'test-key',
        timeout: 1000,
      });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Claude API request timed out'
      );
    });
  });
});

describe('createClaudePlugin', () => {
  it('should create a plugin with claude enrichment', () => {
    const plugin = createClaudePlugin({ apiKey: 'test-key' });

    expect(plugin.name).toBe('ai-enrichment-claude');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('ai');
  });

  it('should accept enrichment options', () => {
    const plugin = createClaudePlugin(
      { apiKey: 'test-key' },
      { tasks: ['descriptions'], batchSize: 10 }
    );

    expect(plugin.name).toBe('ai-enrichment-claude');
  });

  it('should have install function', () => {
    const plugin = createClaudePlugin({ apiKey: 'test-key' });
    expect(typeof plugin.install).toBe('function');
  });
});
