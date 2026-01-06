/**
 * JSON Output Plugin
 * Generates structured JSON documentation
 * @module plugins/core/json-output
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { generateJson } from '../../outputs/json.js';

/**
 * JSON Output Plugin
 * Generates structured JSON for programmatic use
 */
export const jsonOutputPlugin: Plugin<ExtractorContext> = {
  name: 'json-output',
  version: '1.0.0',
  category: 'output',

  install(kernel) {
    kernel.on('output:start', async (context) => {
      // Check if json format is requested
      if (!context.options.formats?.includes('json')) {
        return;
      }

      try {
        const output = generateJson(context, {
          pretty: true,
          includeEmpty: false,
          includeSourceLocations: true,
        });

        context.outputs.set('json', output);
      } catch (error) {
        context.errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    });
  },
};

export default jsonOutputPlugin;
