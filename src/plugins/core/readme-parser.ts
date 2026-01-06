/**
 * README Parser Plugin
 * Parses README.md to extract documentation content
 * @module plugins/core/readme-parser
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { parseReadme } from '../../parsers/readme.js';

/**
 * README Parser Plugin
 * Extracts structured content from package README
 */
export const readmeParserPlugin: Plugin<ExtractorContext> = {
  name: 'readme-parser',
  version: '1.0.0',
  category: 'parser',

  install(kernel) {
    kernel.on('parse:start', async (context) => {
      const { files } = context.package;

      // Find README file (case-insensitive)
      let readmeContent: string | undefined;
      let readmePath: string | undefined;

      const readmePatterns = [
        'README.md',
        'readme.md',
        'Readme.md',
        'README.MD',
        'README',
        'readme',
      ];

      for (const pattern of readmePatterns) {
        if (files.has(pattern)) {
          readmeContent = files.get(pattern);
          readmePath = pattern;
          break;
        }
      }

      if (!readmeContent) {
        // Try to find any readme file
        for (const [path, content] of files) {
          if (path.toLowerCase().includes('readme')) {
            readmeContent = content;
            readmePath = path;
            break;
          }
        }
      }

      if (!readmeContent) {
        return;
      }

      try {
        context.readme = parseReadme(readmeContent);

        // Update package description if not set
        if (!context.package.description && context.readme.description) {
          context.package.description = context.readme.description;
        }
      } catch (error) {
        context.errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    });
  },
};

export default readmeParserPlugin;
