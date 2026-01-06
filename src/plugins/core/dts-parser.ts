/**
 * DTS Parser Plugin
 * Parses TypeScript declaration files to extract API information
 * @module plugins/core/dts-parser
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { parseDts, findMainDtsFile, sortExports } from '../../parsers/dts.js';

/**
 * DTS Parser Plugin
 * Parses .d.ts files to extract API entries
 */
export const dtsParserPlugin: Plugin<ExtractorContext> = {
  name: 'dts-parser',
  version: '1.0.0',
  category: 'parser',

  install(kernel) {
    kernel.on('parse:start', async (context) => {
      const { files } = context.package;

      // Find main .d.ts file
      const mainDts = findMainDtsFile(files, context.package.types);

      if (!mainDts) {
        // No .d.ts files found, skip
        return;
      }

      // Get all .d.ts files, prioritizing main entry
      const dtsFiles = Array.from(files.entries())
        .filter(([path]) => path.endsWith('.d.ts'))
        .sort(([a], [b]) => {
          if (a === mainDts) return -1;
          if (b === mainDts) return 1;
          // Prioritize index files
          if (a.includes('index.d.ts')) return -1;
          if (b.includes('index.d.ts')) return 1;
          return a.localeCompare(b);
        });

      // Parse each file
      const seenNames = new Set<string>();

      for (const [path, content] of dtsFiles) {
        try {
          const result = parseDts(content, path);

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

export default dtsParserPlugin;
