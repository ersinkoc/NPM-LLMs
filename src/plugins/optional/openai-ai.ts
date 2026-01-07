/**
 * OpenAI Plugin
 * Integrates OpenAI and OpenAI-compatible APIs for documentation enrichment
 * @module plugins/optional/openai-ai
 */

import type { AIProvider, CompletionOptions } from '../../types.js';
import { AIError } from '../../errors.js';
import { createAIEnrichmentPlugin, type AIEnrichmentOptions } from './ai-base.js';

/**
 * OpenAI-compatible provider presets
 */
export const OPENAI_COMPATIBLE_PRESETS = {
  openai: {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    envKey: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4.1-nano',
  },
  xai: {
    name: 'xai',
    baseUrl: 'https://api.x.ai/v1',
    envKey: 'XAI_API_KEY',
    defaultModel: 'grok-3-mini-fast',
  },
  zai: {
    name: 'zai',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    envKey: 'ZAI_API_KEY',
    defaultModel: 'glm-4.7',
  },
  together: {
    name: 'together',
    baseUrl: 'https://api.together.xyz/v1',
    envKey: 'TOGETHER_API_KEY',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },
  perplexity: {
    name: 'perplexity',
    baseUrl: 'https://api.perplexity.ai',
    envKey: 'PERPLEXITY_API_KEY',
    defaultModel: 'sonar-pro',
  },
  openrouter: {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    envKey: 'OPENROUTER_API_KEY',
    defaultModel: 'anthropic/claude-3.5-sonnet',
  },
  deepseek: {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com/v1',
    envKey: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
  },
  mistral: {
    name: 'mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    envKey: 'MISTRAL_API_KEY',
    defaultModel: 'mistral-small-latest',
  },
} as const;

export type OpenAICompatiblePreset = keyof typeof OPENAI_COMPATIBLE_PRESETS;

/**
 * OpenAI API configuration
 */
export interface OpenAIConfig {
  /** API key (or set OPENAI_API_KEY env var) */
  apiKey?: string;
  /** Model to use */
  model?:
    | 'gpt-4.1'
    | 'gpt-4.1-mini'
    | 'gpt-4.1-nano'
    | 'gpt-4o'
    | 'gpt-4o-mini'
    | 'o4-mini'
    | 'o3'
    | 'o3-mini'
    | 'o3-pro'
    | 'o1'
    | 'o1-pro'
    | string;
  /** API base URL (with /v1 suffix for chat/completions endpoint) */
  baseUrl?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Organization ID (OpenAI only) */
  organization?: string;
  /** Provider preset for OpenAI-compatible APIs */
  preset?: OpenAICompatiblePreset;
}

/**
 * Default OpenAI configuration
 */
const DEFAULT_CONFIG: Required<Omit<OpenAIConfig, 'organization' | 'preset'>> & {
  organization?: string;
  preset?: OpenAICompatiblePreset;
} = {
  apiKey: '',
  model: 'gpt-4.1-nano',
  baseUrl: 'https://api.openai.com/v1',
  timeout: 30000,
  organization: undefined,
  preset: undefined,
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
  // Apply preset if specified
  const preset = config.preset ? OPENAI_COMPATIBLE_PRESETS[config.preset] : null;

  const cfg = {
    ...DEFAULT_CONFIG,
    ...(preset && {
      baseUrl: preset.baseUrl,
      model: preset.defaultModel,
    }),
    ...config,
    apiKey: config.apiKey || process.env[preset?.envKey ?? 'OPENAI_API_KEY'] || '',
  };

  const providerName = preset?.name ?? 'openai';

  return {
    name: providerName,

    isAvailable(): boolean {
      return !!cfg.apiKey;
    },

    async complete(prompt: string, options?: CompletionOptions): Promise<string> {
      if (!cfg.apiKey) {
        throw new AIError(`${preset?.envKey ?? 'OPENAI_API_KEY'} not set`, providerName);
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
        const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new AIError(
            `${providerName} API error: ${response.status} ${response.statusText} - ${errorText}`,
            providerName
          );
        }

        const data = (await response.json()) as OpenAIResponse;

        const choice = data.choices[0];
        if (!choice || !choice.message.content) {
          throw new AIError(`No content in ${providerName} response`, providerName);
        }

        return choice.message.content;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof AIError) {
          throw error;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          throw new AIError(`${providerName} API request timed out`, providerName);
        }

        throw new AIError(
          `${providerName} API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          providerName
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

/**
 * Create x.ai (Grok) provider
 * @param config - Configuration (apiKey, model, etc.)
 */
export function createXAIProvider(config: Omit<OpenAIConfig, 'preset'> = {}): AIProvider {
  return createOpenAIProvider({ ...config, preset: 'xai' });
}

/**
 * Create z.ai (GLM) provider
 * @param config - Configuration (apiKey, model, etc.)
 */
export function createZAIProvider(config: Omit<OpenAIConfig, 'preset'> = {}): AIProvider {
  return createOpenAIProvider({ ...config, preset: 'zai' });
}

/**
 * Create Together AI provider
 * @param config - Configuration (apiKey, model, etc.)
 */
export function createTogetherProvider(config: Omit<OpenAIConfig, 'preset'> = {}): AIProvider {
  return createOpenAIProvider({ ...config, preset: 'together' });
}

/**
 * Create Perplexity provider
 * @param config - Configuration (apiKey, model, etc.)
 */
export function createPerplexityProvider(config: Omit<OpenAIConfig, 'preset'> = {}): AIProvider {
  return createOpenAIProvider({ ...config, preset: 'perplexity' });
}

/**
 * Create OpenRouter provider
 * @param config - Configuration (apiKey, model, etc.)
 */
export function createOpenRouterProvider(config: Omit<OpenAIConfig, 'preset'> = {}): AIProvider {
  return createOpenAIProvider({ ...config, preset: 'openrouter' });
}

/**
 * Create DeepSeek provider
 * @param config - Configuration (apiKey, model, etc.)
 */
export function createDeepSeekProvider(config: Omit<OpenAIConfig, 'preset'> = {}): AIProvider {
  return createOpenAIProvider({ ...config, preset: 'deepseek' });
}

/**
 * Create Mistral provider
 * @param config - Configuration (apiKey, model, etc.)
 */
export function createMistralProvider(config: Omit<OpenAIConfig, 'preset'> = {}): AIProvider {
  return createOpenAIProvider({ ...config, preset: 'mistral' });
}

export { createAIEnrichmentPlugin, type AIEnrichmentOptions };
