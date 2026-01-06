/**
 * Groq Plugin
 * Integrates Groq's fast inference for documentation enrichment
 * @module plugins/optional/groq-ai
 */

import type { AIProvider, CompletionOptions } from '../../types.js';
import { AIError } from '../../errors.js';
import { createAIEnrichmentPlugin, type AIEnrichmentOptions } from './ai-base.js';

/**
 * Groq API configuration
 */
export interface GroqConfig {
  /** API key (or set GROQ_API_KEY env var) */
  apiKey?: string;
  /** Model to use */
  model?: string;
  /** API base URL */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Default Groq configuration
 */
const DEFAULT_CONFIG: Required<GroqConfig> = {
  apiKey: '',
  model: 'llama-3.1-8b-instant',
  baseUrl: 'https://api.groq.com/openai',
  timeout: 30000,
};

/**
 * Groq chat message format (OpenAI compatible)
 */
interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Groq API request body
 */
interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * Groq API response
 */
interface GroqResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Create Groq provider
 * @param config - Groq configuration
 * @returns AI provider instance
 */
export function createGroqProvider(config: GroqConfig = {}): AIProvider {
  const cfg = {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey: config.apiKey || process.env['GROQ_API_KEY'] || '',
  };

  return {
    name: 'groq',

    isAvailable(): boolean {
      return !!cfg.apiKey;
    },

    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      if (!cfg.apiKey) {
        throw new AIError('GROQ_API_KEY not set', 'groq');
      }

      const messages: GroqMessage[] = [];

      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const requestBody: GroqRequest = {
        model: cfg.model,
        messages,
        max_tokens: options?.maxTokens ?? 1000,
        temperature: options?.temperature ?? 0.3,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

      try {
        const response = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${cfg.apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new AIError(
            `Groq API error: ${response.status} ${response.statusText} - ${errorText}`,
            'groq'
          );
        }

        const data = (await response.json()) as GroqResponse;

        const choice = data.choices[0];
        if (!choice || !choice.message.content) {
          throw new AIError('No content in Groq response', 'groq');
        }

        return choice.message.content;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof AIError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new AIError('Groq API request timed out', 'groq');
        }

        throw new AIError(
          `Groq API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'groq'
        );
      }
    },
  };
}

/**
 * Create Groq enrichment plugin
 * @param config - Groq configuration
 * @param enrichmentOptions - Enrichment options
 * @returns Plugin instance
 */
export function createGroqPlugin(
  config: GroqConfig = {},
  enrichmentOptions?: Partial<AIEnrichmentOptions>
) {
  const provider = createGroqProvider(config);
  return createAIEnrichmentPlugin(provider, enrichmentOptions);
}

export { createAIEnrichmentPlugin, type AIEnrichmentOptions };
