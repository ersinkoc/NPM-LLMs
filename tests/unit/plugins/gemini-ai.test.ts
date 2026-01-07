/**
 * Gemini Provider Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGeminiProvider, createGeminiPlugin, checkGeminiAvailable } from '../../../src/plugins/optional/gemini-ai.js';

describe('createGeminiProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return false when no API key is provided', () => {
      const provider = createGeminiProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('should return true when API key is provided in config', () => {
      const provider = createGeminiProvider({ apiKey: 'test-api-key' });
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return true when GOOGLE_API_KEY is in environment', () => {
      process.env.GOOGLE_API_KEY = 'google-env-key';
      const provider = createGeminiProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    it('should return true when GEMINI_API_KEY is in environment', () => {
      process.env.GEMINI_API_KEY = 'gemini-env-key';
      const provider = createGeminiProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    it('should prefer GOOGLE_API_KEY over GEMINI_API_KEY', () => {
      process.env.GOOGLE_API_KEY = 'google-key';
      process.env.GEMINI_API_KEY = 'gemini-key';
      const provider = createGeminiProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  describe('complete', () => {
    it('should throw error when API key is not set', async () => {
      const provider = createGeminiProvider();

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Gemini API key not configured'
      );
    });

    it('should make correct API request', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [
            {
              content: {
                parts: [{ text: 'Generated response' }],
              },
              finishReason: 'STOP',
            },
          ],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGeminiProvider({ apiKey: 'test-api-key' });
      const result = await provider.complete('test prompt', {
        maxTokens: 500,
        temperature: 0.7,
      });

      expect(result).toBe('Generated response');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      // Check URL contains API key
      const url = (fetch as any).mock.calls[0][0];
      expect(url).toContain('key=test-api-key');

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.generationConfig.maxOutputTokens).toBe(500);
      expect(requestBody.generationConfig.temperature).toBe(0.7);
    });

    it('should use custom model when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGeminiProvider({
        apiKey: 'test-api-key',
        model: 'gemini-1.5-pro',
      });
      await provider.complete('test prompt');

      const url = (fetch as any).mock.calls[0][0];
      expect(url).toContain('models/gemini-1.5-pro:generateContent');
    });

    it('should include system prompt when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGeminiProvider({ apiKey: 'test-api-key' });
      await provider.complete('test prompt', { systemPrompt: 'You are helpful' });

      const requestBody = JSON.parse((fetch as any).mock.calls[0][1].body);
      expect(requestBody.contents.length).toBe(3); // system context + model ack + user prompt
      expect(requestBody.contents[0].parts[0].text).toContain('System instruction: You are helpful');
      expect(requestBody.contents[1].role).toBe('model');
      expect(requestBody.contents[2].parts[0].text).toBe('test prompt');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: vi.fn().mockResolvedValue('Invalid API key'),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGeminiProvider({ apiKey: 'invalid-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Gemini API error (403)'
      );
    });

    it('should handle error in response body', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          error: {
            code: 400,
            message: 'Bad request',
            status: 'INVALID_ARGUMENT',
          },
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGeminiProvider({ apiKey: 'test-api-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Gemini API error: Bad request'
      );
    });

    it('should handle empty response', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGeminiProvider({ apiKey: 'test-api-key' });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'No response generated from Gemini'
      );
    });

    it('should handle timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      global.fetch = vi.fn().mockRejectedValue(abortError);

      const provider = createGeminiProvider({
        apiKey: 'test-api-key',
        timeout: 1000,
      });

      await expect(provider.complete('test prompt')).rejects.toThrow(
        'Gemini request timed out'
      );
    });

    it('should use custom baseUrl when provided', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'Response' }] } }],
        }),
      };

      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const provider = createGeminiProvider({
        apiKey: 'test-api-key',
        baseUrl: 'https://custom-api.example.com/v1',
      });
      await provider.complete('test prompt');

      const url = (fetch as any).mock.calls[0][0];
      expect(url).toContain('https://custom-api.example.com/v1/models/');
    });
  });
});

describe('createGeminiPlugin', () => {
  it('should create a plugin with gemini enrichment', () => {
    const plugin = createGeminiPlugin({ apiKey: 'test-api-key' });

    expect(plugin.name).toBe('ai-enrichment-gemini');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.category).toBe('ai');
  });

  it('should have install function', () => {
    const plugin = createGeminiPlugin({ apiKey: 'test-api-key' });
    expect(typeof plugin.install).toBe('function');
  });
});

describe('checkGeminiAvailable', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return false when no API key is set', () => {
    expect(checkGeminiAvailable()).toBe(false);
  });

  it('should return true when GOOGLE_API_KEY is set', () => {
    process.env.GOOGLE_API_KEY = 'test-key';
    expect(checkGeminiAvailable()).toBe(true);
  });

  it('should return true when GEMINI_API_KEY is set', () => {
    process.env.GEMINI_API_KEY = 'test-key';
    expect(checkGeminiAvailable()).toBe(true);
  });
});
