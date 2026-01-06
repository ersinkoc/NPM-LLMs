/**
 * TypeScript Source Parser Plugin
 * Fallback parser for packages without .d.ts files
 * @module plugins/core/ts-source-parser
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { parseTypeScript, findTypeScriptFiles } from '../../parsers/typescript.js';
import { sortExports } from '../../parsers/dts.js';

/**
 * TypeScript Source Parser Plugin
 * Parses .ts/.tsx files when .d.ts files are not available
 */
export const tsSourceParserPlugin: Plugin<ExtractorContext> = {
  name: 'ts-source-parser',
  version: '1.0.0',
  category: 'parser',

  install(kernel) {
    kernel.on('parse:start', async (context) => {
      // Only run if no API entries found (no .d.ts files parsed)
      if (context.api.length > 0) {
        return;
      }

      const { files } = context.package;

      // Find TypeScript source files
      const tsFiles = findTypeScriptFiles(files, context.package.main);

      if (tsFiles.length === 0) {
        return;
      }

      // Parse each file
      const seenNames = new Set<string>();

      for (const path of tsFiles) {
        const content = files.get(path);
        if (!content) continue;

        try {
          const result = parseTypeScript(content, path);

          // Add unique exports
          for (const entry of result.exports) {
            if (!seenNames.has(entry.name)) {
              seenNames.add(entry.name);
              context.api.push(entry);
            }
          }
        } catch (error) {
          // Log error but continue with other files
          context.errors.push(error instanceof Error ? error : new Error(String(error)));
        }
      }

      // Sort exports by kind and name
      context.api = sortExports(context.api);
    });
  },
};

export default tsSourceParserPlugin;
