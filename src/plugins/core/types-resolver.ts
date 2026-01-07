/**
 * Types Resolver Plugin
 * Automatically fetches @types/* packages when main package lacks .d.ts files
 * @module plugins/core/types-resolver
 */

import type { Plugin, ExtractorContext } from '../../types.js';
import { fetchPackage, FetcherOptions } from '../../core/fetcher.js';

/**
 * Check if package has any .d.ts files
 */
function hasDtsFiles(files: Map<string, string>): boolean {
  for (const path of files.keys()) {
    if (path.endsWith('.d.ts')) {
      return true;
    }
  }
  return false;
}

/**
 * Get the @types package name for a given package
 * @example
 * - lodash -> @types/lodash
 * - @babel/core -> @types/babel__core
 */
function getTypesPackageName(packageName: string): string {
  if (packageName.startsWith('@')) {
    // Scoped package: @scope/name -> @types/scope__name
    const withoutAt = packageName.slice(1);
    return `@types/${withoutAt.replace('/', '__')}`;
  }
  return `@types/${packageName}`;
}

/**
 * Check if a package is a DefinitelyTyped types package
 */
function isTypesPackage(packageName: string): boolean {
  return packageName.startsWith('@types/');
}

/**
 * Types Resolver Plugin
 * Fetches @types/* package when main package has no .d.ts files
 */
export const typesResolverPlugin: Plugin<ExtractorContext> = {
  name: 'types-resolver',
  version: '1.0.0',
  category: 'parser',

  install(kernel) {
    kernel.on('package:fetched', async (context) => {
      const { files, name } = context.package;

      // Skip if this is already a @types package
      if (isTypesPackage(name)) {
        return;
      }

      // Skip if package already has .d.ts files
      if (hasDtsFiles(files)) {
        return;
      }

      // Try to fetch @types package
      const typesPackageName = getTypesPackageName(name);

      try {
        const typesPackage = await fetchPackage(typesPackageName);

        // Merge .d.ts files from @types package into main package
        let mergedCount = 0;
        for (const [path, content] of typesPackage.files) {
          if (path.endsWith('.d.ts')) {
            // Prefix with __types__ to avoid conflicts and indicate source
            const newPath = `__types__/${path}`;
            files.set(newPath, content);
            mergedCount++;
          }
        }

        // Also set the types entry point if found
        if (typesPackage.types && !context.package.types) {
          context.package.types = `__types__/${typesPackage.types}`;
        }

        // Log success (will be captured in verbose mode)
        if (mergedCount > 0) {
          console.error(
            `[types-resolver] Merged ${mergedCount} .d.ts files from ${typesPackageName}`
          );
        }
      } catch (error) {
        // @types package doesn't exist - this is fine, not all packages have types
        // We silently continue without types
      }
    });
  },
};

export default typesResolverPlugin;
