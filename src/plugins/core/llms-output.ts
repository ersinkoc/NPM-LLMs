/**
 * llms.txt Output Plugin
 * Generates concise LLM-optimized documentation
 * @module plugins/core/llms-output
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { generateLlmsTxt, DEFAULT_LLMS_TOKEN_LIMIT } from '../../outputs/llms.js';

/**
 * llms.txt Output Plugin
 * Generates llms.txt within token limits
 */
export const llmsOutputPlugin: Plugin<ExtractorContext> = {
  name: 'llms-output',
  version: '1.0.0',
  category: 'output',

  install(kernel) {
    kernel.on('output:start', async (context) => {
      // Check if llms format is requested
      if (!context.options.formats?.includes('llms')) {
        return;
      }

      try {
        const tokenLimit = context.options.llmsTokenLimit ?? DEFAULT_LLMS_TOKEN_LIMIT;

        const output = generateLlmsTxt(context, {
          tokenLimit,
          includeInstall: true,
          includeQuickStart: true,
        });

        context.outputs.set('llms', output);
      } catch (error) {
        context.errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    });
  },
};

export default llmsOutputPlugin;
