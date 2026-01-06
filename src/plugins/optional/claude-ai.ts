/**
 * Claude AI Plugin
 * Integrates Anthropic's Claude for documentation enrichment
 * @module plugins/optional/claude-ai
 */

import type { AIProvider, CompletionOptions } from '../../types.js';
import { AIError } from '../../errors.js';
import { createAIEnrichmentPlugin, type AIEnrichmentOptions } from './ai-base.js';

/**
 * Claude API configuration
 */
export interface ClaudeConfig {
  /** API key (or set ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Model to use */
  model?: string;
  /** API base URL */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Default Claude configuration
 */
const DEFAULT_CONFIG: Required<ClaudeConfig> = {
  apiKey: '',
  model: 'claude-3-haiku-20240307',
  baseUrl: 'https://api.anthropic.com',
  timeout: 30000,
};

/**
 * Claude API message format
 */
interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Claude API request body
 */
interface ClaudeRequest {
  model: string;
  max_tokens: number;
  messages: ClaudeMessage[];
  system?: string;
  temperature?: number;
}

/**
 * Claude API response
 */
interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Create Claude AI provider
 * @param config - Claude configuration
 * @returns AI provider instance
 */
export function createClaudeProvider(config: ClaudeConfig = {}): AIProvider {
  const cfg = {
    ...DEFAULT_CONFIG,
    ...config,
    apiKey: config.apiKey || process.env['ANTHROPIC_API_KEY'] || '',
  };

  return {
    name: 'claude',

    isAvailable(): boolean {
      return !!cfg.apiKey;
    },

    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      if (!cfg.apiKey) {
        throw new AIError('ANTHROPIC_API_KEY not set', 'claude');
      }

      const requestBody: ClaudeRequest = {
        model: cfg.model,
        max_tokens: options?.maxTokens ?? 1000,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.3,
      };

      if (options?.systemPrompt) {
        requestBody.system = options.systemPrompt;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

      try {
        const response = await fetch(`${cfg.baseUrl}/v1/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': cfg.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new AIError(
            `Claude API error: ${response.status} ${response.statusText} - ${errorText}`,
            'claude'
          );
        }

        const data = (await response.json()) as ClaudeResponse;

        // Extract text from content blocks
        const textContent = data.content.find((c) => c.type === 'text');
        if (!textContent) {
          throw new AIError('No text content in Claude response', 'claude');
        }

        return textContent.text;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof AIError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new AIError('Claude API request timed out', 'claude');
        }

        throw new AIError(
          `Claude API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'claude'
        );
      }
    },
  };
}

/**
 * Create Claude AI enrichment plugin
 * @param config - Claude configuration
 * @param enrichmentOptions - Enrichment options
 * @returns Plugin instance
 */
export function createClaudePlugin(
  config: ClaudeConfig = {},
  enrichmentOptions?: Partial<AIEnrichmentOptions>
) {
  const provider = createClaudeProvider(config);
  return createAIEnrichmentPlugin(provider, enrichmentOptions);
}

export { createAIEnrichmentPlugin, type AIEnrichmentOptions };
