/**
 * Optional plugins for @oxog/npm-llms
 * These plugins provide AI enrichment and additional output formats
 * @module plugins/optional
 */

// AI Base
export {
  createAIEnrichmentPlugin,
  createSimpleProvider,
  type AIEnrichmentTask,
  type AIEnrichmentOptions,
} from './ai-base.js';

// Claude AI
export {
  createClaudeProvider,
  createClaudePlugin,
  type ClaudeConfig,
} from './claude-ai.js';

// OpenAI
export {
  createOpenAIProvider,
  createOpenAIPlugin,
  type OpenAIConfig,
} from './openai-ai.js';

// Gemini AI
export {
  createGeminiProvider,
  createGeminiPlugin,
  checkGeminiAvailable,
  type GeminiConfig,
} from './gemini-ai.js';

// Ollama (local models)
export {
  createOllamaProvider,
  createOllamaPlugin,
  checkOllamaAvailable,
  listOllamaModels,
  type OllamaConfig,
} from './ollama-ai.js';

// Groq (fast inference)
export {
  createGroqProvider,
  createGroqPlugin,
  type GroqConfig,
} from './groq-ai.js';

// Changelog Parser
export {
  parseChangelog,
  findChangelog,
  getLatestVersion,
  getVersion,
  formatChangelogEntry,
  createChangelogParserPlugin,
} from './changelog-parser.js';

// HTML Output
export {
  generateHTML,
  createHTMLOutputPlugin,
  type HTMLOutputOptions,
} from './html-output.js';
