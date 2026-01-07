/**
 * AI Base Plugin
 * Provides common infrastructure for AI-powered documentation enrichment
 * @module plugins/optional/ai-base
 */

import type { Plugin, ExtractorContext, AIProvider, CompletionOptions, APIEntry } from '../../types.js';
import { AIError } from '../../errors.js';

/**
 * AI enrichment task types
 */
export type AIEnrichmentTask = 'descriptions' | 'examples' | 'summary' | 'params' | 'returns';

/**
 * AI enrichment options
 */
export interface AIEnrichmentOptions {
  /** Tasks to perform */
  tasks: AIEnrichmentTask[];
  /** Maximum tokens per request */
  maxTokensPerRequest?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Batch size for processing entries */
  batchSize?: number;
  /** Whether to skip entries that already have content */
  skipExisting?: boolean;
}

/**
 * Default enrichment options
 */
const DEFAULT_OPTIONS: AIEnrichmentOptions = {
  tasks: ['descriptions', 'examples'],
  maxTokensPerRequest: 1000,
  temperature: 0.3,
  batchSize: 5,
  skipExisting: true,
};

/**
 * System prompts for different tasks
 */
const SYSTEM_PROMPTS: Record<AIEnrichmentTask, string> = {
  descriptions: `You are a technical documentation expert. Generate concise, clear descriptions for API entries.
Rules:
- Be specific about what the function/class does
- Mention important parameters and return values
- Keep descriptions under 100 words
- Use present tense ("Returns..." not "Will return...")
- Don't include example code in descriptions`,

  examples: `You are a technical documentation expert. Generate practical usage examples for API entries.
Rules:
- Create 1-2 realistic examples
- Show common use cases
- Include proper TypeScript/JavaScript syntax
- Keep examples concise but complete
- Use meaningful variable names`,

  summary: `You are a technical documentation expert. Generate a summary of an npm package.
Rules:
- Describe the main purpose and use cases
- Mention key features
- Keep it under 150 words
- Be objective and informative`,

  params: `You are a technical documentation expert. Generate parameter descriptions.
Rules:
- Be specific about expected values
- Mention valid ranges or formats
- Note if parameter is optional
- Keep each description under 20 words`,

  returns: `You are a technical documentation expert. Generate return value descriptions.
Rules:
- Describe what is returned
- Mention possible values or states
- Keep descriptions under 30 words`,
};

/**
 * Generate prompt for enriching an API entry
 */
function generateEntryPrompt(entry: APIEntry, task: AIEnrichmentTask): string {
  const parts = [`${entry.kind}: ${entry.name}`, `Signature: ${entry.signature}`];

  if (entry.description) {
    parts.push(`Current description: ${entry.description}`);
  }

  if (entry.params && entry.params.length > 0) {
    const paramList = entry.params.map((p) => `- ${p.name}: ${p.type || 'unknown'}`).join('\n');
    parts.push(`Parameters:\n${paramList}`);
  }

  if (entry.returns) {
    parts.push(`Returns: ${entry.returns.type}`);
  }

  switch (task) {
    case 'descriptions':
      parts.push('\nGenerate a clear description for this API entry:');
      break;
    case 'examples':
      parts.push('\nGenerate a practical usage example:');
      break;
  }

  return parts.join('\n');
}

/**
 * Generate prompt for package summary
 */
function generateSummaryPrompt(context: ExtractorContext): string {
  const { package: pkg, api } = context;

  const functionCount = api.filter((e) => e.kind === 'function').length;
  const classCount = api.filter((e) => e.kind === 'class').length;
  const typeCount = api.filter((e) => e.kind === 'type' || e.kind === 'interface').length;

  return `
Package: ${pkg.name}@${pkg.version}
Description: ${pkg.description || 'No description available'}
Functions: ${functionCount}
Classes: ${classCount}
Types: ${typeCount}

Top exports:
${api
  .slice(0, 10)
  .map((e) => `- ${e.kind} ${e.name}`)
  .join('\n')}

Generate a summary of this package that explains its purpose and main features:
`.trim();
}

/**
 * Parse AI response for descriptions
 */
function parseDescriptionResponse(response: string): string {
  // Clean up the response - first remove prefix, then quotes
  return response.trim().replace(/^Description:\s*/i, '').replace(/^["']|["']$/g, '');
}

/**
 * Parse AI response for examples
 */
function parseExampleResponse(response: string): string[] {
  const examples: string[] = [];

  // Try to extract code blocks
  const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(response)) !== null) {
    if (match[1]?.trim()) {
      examples.push(match[1].trim());
    }
  }

  // If no code blocks found, use the whole response
  if (examples.length === 0 && response.trim()) {
    examples.push(response.trim());
  }

  return examples;
}

/**
 * Create AI enrichment plugin
 * @param provider - AI provider implementation
 * @param options - Enrichment options
 * @returns Plugin instance
 */
export function createAIEnrichmentPlugin(
  provider: AIProvider,
  options: Partial<AIEnrichmentOptions> = {}
): Plugin {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return {
    name: `ai-enrichment-${provider.name}`,
    version: '1.0.0',
    category: 'ai',

    install(kernel) {
      // Register AI enrichment event handler
      kernel.on('ai:enrich', async (context: ExtractorContext) => {
        if (!provider.isAvailable()) {
          throw new AIError(`AI provider ${provider.name} is not available`, provider.name);
        }

        // Enrich API entries
        if (opts.tasks.includes('descriptions') || opts.tasks.includes('examples')) {
          await enrichEntries(context, provider, opts);
        }

        // Generate summary
        if (opts.tasks.includes('summary')) {
          await enrichSummary(context, provider, opts);
        }
      });
    },
  };
}

/**
 * Enrich API entries with AI-generated content
 */
async function enrichEntries(
  context: ExtractorContext,
  provider: AIProvider,
  options: AIEnrichmentOptions
): Promise<void> {
  const { api } = context;
  const { tasks, batchSize, skipExisting, maxTokensPerRequest, temperature } = options;

  // Filter entries that need enrichment
  const entriesToEnrich = api.filter((entry) => {
    if (skipExisting) {
      if (tasks.includes('descriptions') && entry.description) return false;
      if (tasks.includes('examples') && entry.examples && entry.examples.length > 0) return false;
    }
    // Only enrich functions and classes
    return entry.kind === 'function' || entry.kind === 'class';
  });

  // Process in batches
  for (let i = 0; i < entriesToEnrich.length; i += batchSize!) {
    const batch = entriesToEnrich.slice(i, i + batchSize!);

    await Promise.all(
      batch.map(async (entry) => {
        try {
          // Generate descriptions
          if (tasks.includes('descriptions') && (!skipExisting || !entry.description)) {
            const prompt = generateEntryPrompt(entry, 'descriptions');
            const response = await provider.complete(prompt, {
              maxTokens: maxTokensPerRequest,
              temperature,
              systemPrompt: SYSTEM_PROMPTS.descriptions,
            });
            entry.description = parseDescriptionResponse(response);
          }

          // Generate examples
          if (tasks.includes('examples') && (!skipExisting || !entry.examples?.length)) {
            const prompt = generateEntryPrompt(entry, 'examples');
            const response = await provider.complete(prompt, {
              maxTokens: maxTokensPerRequest,
              temperature,
              systemPrompt: SYSTEM_PROMPTS.examples,
            });
            entry.examples = parseExampleResponse(response);
          }
        } catch (error) {
          // Log but don't fail on individual entry errors
          context.errors.push(
            error instanceof Error ? error : new Error(`AI enrichment failed for ${entry.name}`)
          );
        }
      })
    );
  }
}

/**
 * Enrich package with AI-generated summary
 */
async function enrichSummary(
  context: ExtractorContext,
  provider: AIProvider,
  options: AIEnrichmentOptions
): Promise<void> {
  try {
    const prompt = generateSummaryPrompt(context);
    const response = await provider.complete(prompt, {
      maxTokens: options.maxTokensPerRequest,
      temperature: options.temperature,
      systemPrompt: SYSTEM_PROMPTS.summary,
    });

    // Store summary in readme if available
    if (context.readme) {
      if (!context.readme.description) {
        context.readme.description = response.trim();
      }
    }
  } catch (error) {
    context.errors.push(
      error instanceof Error ? error : new Error('AI summary generation failed')
    );
  }
}

/**
 * Create a simple AI provider from a completion function
 */
export function createSimpleProvider(
  name: string,
  completeFn: (prompt: string, options?: CompletionOptions) => Promise<string>,
  isAvailableFn: () => boolean = () => true
): AIProvider {
  return {
    name,
    isAvailable: isAvailableFn,
    complete: completeFn,
  };
}
