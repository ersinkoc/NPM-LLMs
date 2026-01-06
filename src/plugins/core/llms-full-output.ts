/**
 * llms-full.txt Output Plugin
 * Generates complete LLM-optimized documentation
 * @module plugins/core/llms-full-output
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { generateLlmsFullTxt } from '../../outputs/llms-full.js';

/**
 * llms-full.txt Output Plugin
 * Generates complete API documentation without token limits
 */
export const llmsFullOutputPlugin: Plugin<ExtractorContext> = {
  name: 'llms-full-output',
  version: '1.0.0',
  category: 'output',

  install(kernel) {
    kernel.on('output:start', async (context) => {
      // Check if llms-full format is requested
      if (!context.options.formats?.includes('llms-full')) {
        return;
      }

      try {
        const output = generateLlmsFullTxt(context, {
          includeExamples: true,
          includeParamDescriptions: true,
          includeDeprecations: true,
        });

        context.outputs.set('llms-full', output);
      } catch (error) {
        context.errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    });
  },
};

export default llmsFullOutputPlugin;
