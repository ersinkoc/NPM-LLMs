/**
 * Core plugins for @oxog/npm-llms
 * @module plugins/core
 */

// Pre-parser plugins (run before parsing)
export { typesResolverPlugin } from './types-resolver.js';

// Parser plugins
export { dtsParserPlugin } from './dts-parser.js';
export { tsSourceParserPlugin } from './ts-source-parser.js';
export { readmeParserPlugin } from './readme-parser.js';

// Output plugins
export { llmsOutputPlugin } from './llms-output.js';
export { llmsFullOutputPlugin } from './llms-full-output.js';
export { markdownOutputPlugin } from './markdown-output.js';
export { jsonOutputPlugin } from './json-output.js';

import type { Plugin, ExtractorContext } from '../../types.js';
import { typesResolverPlugin } from './types-resolver.js';
import { dtsParserPlugin } from './dts-parser.js';
import { tsSourceParserPlugin } from './ts-source-parser.js';
import { readmeParserPlugin } from './readme-parser.js';
import { llmsOutputPlugin } from './llms-output.js';
import { llmsFullOutputPlugin } from './llms-full-output.js';
import { markdownOutputPlugin } from './markdown-output.js';
import { jsonOutputPlugin } from './json-output.js';

/**
 * All core parser plugins
 * Note: typesResolverPlugin must come first to fetch @types/* before parsing
 */
export const coreParserPlugins: Plugin<ExtractorContext>[] = [
  typesResolverPlugin,
  dtsParserPlugin,
  tsSourceParserPlugin,
  readmeParserPlugin,
];

/**
 * All core output plugins
 */
export const coreOutputPlugins: Plugin<ExtractorContext>[] = [
  llmsOutputPlugin,
  llmsFullOutputPlugin,
  markdownOutputPlugin,
  jsonOutputPlugin,
];

/**
 * All core plugins
 */
export const corePlugins: Plugin<ExtractorContext>[] = [
  ...coreParserPlugins,
  ...coreOutputPlugins,
];
