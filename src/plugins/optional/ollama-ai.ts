/**
 * Ollama Plugin
 * Integrates Ollama for local LLM-powered documentation enrichment
 * @module plugins/optional/ollama-ai
 */

import type { AIProvider, CompletionOptions } from '../../types.js';
import { AIError } from '../../errors.js';
import { createAIEnrichmentPlugin, type AIEnrichmentOptions } from './ai-base.js';

/**
 * Ollama configuration
 */
export interface OllamaConfig {
  /** Model to use */
  model?: string;
  /** Ollama API base URL */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
}

/**
 * Default Ollama configuration
 */
const DEFAULT_CONFIG: Required<OllamaConfig> = {
  model: 'llama3.2',
  baseUrl: 'http://localhost:11434',
  timeout: 120000, // Longer timeout for local models
};

/**
 * Ollama generate request
 */
interface OllamaRequest {
  model: string;
  prompt: string;
  system?: string;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
  stream: boolean;
}

/**
 * Ollama generate response
 */
interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Create Ollama provider
 * @param config - Ollama configuration
 * @returns AI provider instance
 */
export function createOllamaProvider(config: OllamaConfig = {}): AIProvider {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let available: boolean | null = null;

  return {
    name: 'ollama',

    isAvailable(): boolean {
      // Return cached result if available
      if (available !== null) {
        return available;
      }

      // Optimistically return true, actual check happens on first request
      return true;
    },

    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      const requestBody: OllamaRequest = {
        model: cfg.model,
        prompt,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.3,
          num_predict: options?.maxTokens ?? 1000,
        },
      };

      if (options?.systemPrompt) {
        requestBody.system = options.systemPrompt;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

      try {
        const response = await fetch(`${cfg.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          available = false;
          const errorText = await response.text();
          throw new AIError(
            `Ollama API error: ${response.status} ${response.statusText} - ${errorText}`,
            'ollama'
          );
        }

        available = true;
        const data = (await response.json()) as OllamaResponse;

        if (!data.response) {
          throw new AIError('No response from Ollama', 'ollama');
        }

        return data.response;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof AIError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new AIError('Ollama request timed out', 'ollama');
        }

        // Connection refused likely means Ollama isn't running
        if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
          available = false;
          throw new AIError('Ollama is not running. Start it with: ollama serve', 'ollama');
        }

        throw new AIError(
          `Ollama request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'ollama'
        );
      }
    },
  };
}

/**
 * Create Ollama enrichment plugin
 * @param config - Ollama configuration
 * @param enrichmentOptions - Enrichment options
 * @returns Plugin instance
 */
export function createOllamaPlugin(
  config: OllamaConfig = {},
  enrichmentOptions?: Partial<AIEnrichmentOptions>
) {
  const provider = createOllamaProvider(config);
  return createAIEnrichmentPlugin(provider, enrichmentOptions);
}

/**
 * Check if Ollama is available
 * @param baseUrl - Ollama base URL
 * @returns True if Ollama is running
 */
export async function checkOllamaAvailable(baseUrl = 'http://localhost:11434'): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * List available Ollama models
 * @param baseUrl - Ollama base URL
 * @returns List of model names
 */
export async function listOllamaModels(baseUrl = 'http://localhost:11434'): Promise<string[]> {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as { models: Array<{ name: string }> };
    return data.models.map((m) => m.name);
  } catch {
    return [];
  }
}

export { createAIEnrichmentPlugin, type AIEnrichmentOptions };
