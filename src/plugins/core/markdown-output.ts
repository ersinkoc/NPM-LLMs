/**
 * Markdown Output Plugin
 * Generates API documentation in Markdown format
 * @module plugins/core/markdown-output
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { generateMarkdown } from '../../outputs/markdown.js';

/**
 * Markdown Output Plugin
 * Generates formatted API documentation
 */
export const markdownOutputPlugin: Plugin<ExtractorContext> = {
  name: 'markdown-output',
  version: '1.0.0',
  category: 'output',

  install(kernel) {
    kernel.on('output:start', async (context) => {
      // Check if markdown format is requested
      if (!context.options.formats?.includes('markdown')) {
        return;
      }

      try {
        // Get repository URL if available
        const repositoryUrl = context.package.repository?.url
          ?.replace(/^git\+/, '')
          .replace(/\.git$/, '');

        const output = generateMarkdown(context, {
          includeToc: true,
          includeParamTables: true,
          includeBadges: true,
          repositoryUrl,
        });

        context.outputs.set('markdown', output);
      } catch (error) {
        context.errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    });
  },
};

export default markdownOutputPlugin;
