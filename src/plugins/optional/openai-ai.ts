/**
 * OpenAI Plugin
 * Integrates OpenAI's GPT models for documentation enrichment
 * @module plugins/optional/openai-ai
 */

import type { AIProvider, CompletionOptions } from '../../types.js';
import { AIError } from '../../errors.js';
import { createAIEnrichmentPlugin, type AIEnrichmentOptions } from './ai-base.js';

/**
 * OpenAI API configuration
 */
export interface OpenAIConfig {
  /** API key (or set OPENAI_API_KEY env var) */
  apiKey?: string;
  /** Model to use */
  model?: string;
  /** API base URL */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Organization ID */
  organization?: string;
}

/**
 * Default OpenAI configuration
 */
const DEFAULT_CONFIG: Required<Omit<OpenAIConfig, 'organization'>> & { organization?: string } = {
  apiKey: '',
  model: 'gpt-4o-mini',
  baseUrl: 'https://api.openai.com',
  timeout: 30000,
  organization: undefined,
};

/**
 * OpenAI chat message format
 */
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI API request body
 */
interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * OpenAI API response
 */
interface OpenAIResponse {
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
 * Create OpenAI provider
 * @param config - OpenAI configuration
 * @returns AI provider instance
 */
export function createOpenAIProvider(config: OpenAIConfig = {}): AIProvider {
  const cfg = {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey: config.apiKey || process.env['OPENAI_API_KEY'] || '',
  };

  return {
    name: 'openai',

    isAvailable(): boolean {
      return !!cfg.apiKey;
    },

    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      if (!cfg.apiKey) {
        throw new AIError('OPENAI_API_KEY not set', 'openai');
      }

      const messages: OpenAIMessage[] = [];

      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      messages.push({ role: 'user', content: prompt });

      const requestBody: OpenAIRequest = {
        model: cfg.model,
        messages,
        max_tokens: options?.maxTokens ?? 1000,
        temperature: options?.temperature ?? 0.3,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      };

      if (cfg.organization) {
        headers['OpenAI-Organization'] = cfg.organization;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

      try {
        const response = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new AIError(
            `OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`,
            'openai'
          );
        }

        const data = (await response.json()) as OpenAIResponse;

        const choice = data.choices[0];
        if (!choice || !choice.message.content) {
          throw new AIError('No content in OpenAI response', 'openai');
        }

        return choice.message.content;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof AIError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new AIError('OpenAI API request timed out', 'openai');
        }

        throw new AIError(
          `OpenAI API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'openai'
        );
      }
    },
  };
}

/**
 * Create OpenAI enrichment plugin
 * @param config - OpenAI configuration
 * @param enrichmentOptions - Enrichment options
 * @returns Plugin instance
 */
export function createOpenAIPlugin(
  config: OpenAIConfig = {},
  enrichmentOptions?: Partial<AIEnrichmentOptions>
) {
  const provider = createOpenAIProvider(config);
  return createAIEnrichmentPlugin(provider, enrichmentOptions);
}

export { createAIEnrichmentPlugin, type AIEnrichmentOptions };
