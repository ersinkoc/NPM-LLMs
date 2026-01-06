/**
 * Gemini AI plugin for @oxog/npm-llms
 * Uses Google's Gemini API for documentation enrichment
 * @module plugins/optional/gemini-ai
 */

import type { Plugin, AIProvider, CompletionOptions } from '../../types.js';
import { createAIEnrichmentPlugin, type AIEnrichmentOptions } from './ai-base.js';

/**
 * Gemini configuration options
 */
export interface GeminiConfig {
  /** Gemini API key (defaults to GOOGLE_API_KEY or GEMINI_API_KEY env var) */
  apiKey?: string;
  /** Model to use */
  model?: 'gemini-pro' | 'gemini-pro-vision' | 'gemini-1.5-pro' | 'gemini-1.5-flash' | string;
  /** API base URL */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
}

const DEFAULT_CONFIG: Required<Omit<GeminiConfig, 'apiKey'>> = {
  model: 'gemini-1.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
  timeout: 60000,
  maxTokens: 1024,
  temperature: 0.3,
};

/**
 * Gemini API response types
 */
interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

/**
 * Create a Gemini AI provider
 * @param config - Gemini configuration
 * @returns AI provider instance
 */
export function createGeminiProvider(config: GeminiConfig = {}): AIProvider {
  const cfg = {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey: config.apiKey || process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY'] || '',
  };

  return {
    name: 'gemini',

    isAvailable(): boolean {
      return !!cfg.apiKey;
    },

    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      if (!cfg.apiKey) {
        throw new Error('Gemini API key not configured. Set GOOGLE_API_KEY or GEMINI_API_KEY environment variable.');
      }

      const url = `${cfg.baseUrl}/models/${cfg.model}:generateContent?key=${cfg.apiKey}`;

      // Build request body
      const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

      // Add system prompt as user context if provided
      if (options?.systemPrompt) {
        contents.push({
          role: 'user',
          parts: [{ text: `System instruction: ${options.systemPrompt}\n\nNow respond to the following:` }],
        });
        contents.push({
          role: 'model',
          parts: [{ text: 'Understood. I will follow those instructions.' }],
        });
      }

      // Add main prompt
      contents.push({
        role: 'user',
        parts: [{ text: prompt }],
      });

      const body = {
        contents,
        generationConfig: {
          maxOutputTokens: options?.maxTokens ?? cfg.maxTokens,
          temperature: options?.temperature ?? cfg.temperature,
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errorText}`);
        }

        const data = (await response.json()) as GeminiResponse;

        if (data.error) {
          throw new Error(`Gemini API error: ${data.error.message}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new Error('No response generated from Gemini');
        }

        return text;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error(`Gemini request timed out after ${cfg.timeout}ms`);
        }

        throw error;
      }
    },
  };
}

/**
 * Create a Gemini enrichment plugin
 * @param config - Gemini configuration
 * @param enrichmentOptions - Enrichment options
 * @returns Gemini plugin
 */
export function createGeminiPlugin(
  config: GeminiConfig = {},
  enrichmentOptions?: Partial<AIEnrichmentOptions>
): Plugin {
  const provider = createGeminiProvider(config);
  return createAIEnrichmentPlugin(provider, enrichmentOptions);
}

/**
 * Check if Gemini is available (API key is set)
 * @returns True if Gemini is available
 */
export function checkGeminiAvailable(): boolean {
  return !!(process.env['GOOGLE_API_KEY'] || process.env['GEMINI_API_KEY']);
}
