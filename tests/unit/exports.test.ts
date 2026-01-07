/**
 * Tests for barrel exports to ensure all modules are properly exported
 */

import { describe, it, expect } from 'vitest';

describe('Main Index Exports (src/index.ts)', () => {
  it('should export error classes', async () => {
    const exports = await import('../../src/index.js');

    expect(exports.NpmLlmsError).toBeDefined();
    expect(exports.PackageNotFoundError).toBeDefined();
    expect(exports.VersionNotFoundError).toBeDefined();
    expect(exports.DownloadError).toBeDefined();
    expect(exports.ParseError).toBeDefined();
    expect(exports.AIError).toBeDefined();
    expect(exports.PluginError).toBeDefined();
    expect(exports.CacheError).toBeDefined();
    expect(exports.ConfigError).toBeDefined();
    expect(exports.TarError).toBeDefined();
    expect(exports.TimeoutError).toBeDefined();
    expect(exports.ValidationError).toBeDefined();
  });

  it('should export error utilities', async () => {
    const exports = await import('../../src/index.js');

    expect(typeof exports.isNpmLlmsError).toBe('function');
    expect(typeof exports.getErrorCode).toBe('function');
    expect(typeof exports.wrapError).toBe('function');
  });

  it('should export core functions', async () => {
    const exports = await import('../../src/index.js');

    expect(typeof exports.createExtractor).toBe('function');
    expect(typeof exports.extract).toBe('function');
    expect(typeof exports.createKernel).toBe('function');
    expect(typeof exports.definePlugin).toBe('function');
    expect(typeof exports.composePlugins).toBe('function');
  });

  it('should export cache functions', async () => {
    const exports = await import('../../src/index.js');

    expect(exports.FileCache).toBeDefined();
    expect(typeof exports.createCache).toBe('function');
    expect(typeof exports.formatBytes).toBe('function');
  });

  it('should export token utilities', async () => {
    const exports = await import('../../src/index.js');

    expect(typeof exports.countTokens).toBe('function');
    expect(typeof exports.truncateToTokenLimit).toBe('function');
    expect(typeof exports.formatTokenCount).toBe('function');
  });

  it('should export fetcher functions', async () => {
    const exports = await import('../../src/index.js');

    expect(typeof exports.fetchPackage).toBe('function');
    expect(typeof exports.fetchPackageMetadata).toBe('function');
    expect(typeof exports.parsePackageSpec).toBe('function');
    expect(typeof exports.validatePackageName).toBe('function');
  });
});

describe('Outputs Index Exports (src/outputs/index.ts)', () => {
  it('should export llms output functions', async () => {
    const exports = await import('../../src/outputs/index.js');

    expect(typeof exports.generateLlmsTxt).toBe('function');
    expect(typeof exports.generateMinimalLlmsTxt).toBe('function');
    expect(typeof exports.fitsTokenLimit).toBe('function');
    expect(typeof exports.estimateLlmsTokens).toBe('function');
  });

  it('should export llms-full output functions', async () => {
    const exports = await import('../../src/outputs/index.js');

    expect(typeof exports.generateLlmsFullTxt).toBe('function');
  });

  it('should export markdown output functions', async () => {
    const exports = await import('../../src/outputs/index.js');

    expect(typeof exports.generateMarkdown).toBe('function');
  });

  it('should export json output functions', async () => {
    const exports = await import('../../src/outputs/index.js');

    expect(typeof exports.generateJson).toBe('function');
    expect(typeof exports.generateJsonObject).toBe('function');
    expect(typeof exports.validateJsonOutput).toBe('function');
  });
});

describe('Parsers Index Exports (src/parsers/index.ts)', () => {
  it('should export jsdoc parser functions', async () => {
    const exports = await import('../../src/parsers/index.js');

    expect(typeof exports.parseJSDoc).toBe('function');
    expect(typeof exports.extractJSDocComments).toBe('function');
    expect(typeof exports.cleanJSDocComment).toBe('function');
  });

  it('should export dts parser functions', async () => {
    const exports = await import('../../src/parsers/index.js');

    expect(typeof exports.parseDts).toBe('function');
    expect(typeof exports.sortExports).toBe('function');
    expect(typeof exports.findMainDtsFile).toBe('function');
  });

  it('should export typescript parser functions', async () => {
    const exports = await import('../../src/parsers/index.js');

    expect(typeof exports.parseTypeScript).toBe('function');
    expect(typeof exports.findTypeScriptFiles).toBe('function');
  });

  it('should export readme parser functions', async () => {
    const exports = await import('../../src/parsers/index.js');

    expect(typeof exports.parseReadme).toBe('function');
    expect(typeof exports.extractCodeBlocks).toBe('function');
    expect(typeof exports.extractSections).toBe('function');
  });
});

describe('Utils Index Exports (src/utils/index.ts)', () => {
  it('should export http utilities', async () => {
    const exports = await import('../../src/utils/index.js');

    expect(typeof exports.fetchJson).toBe('function');
    expect(typeof exports.fetchBinary).toBe('function');
    expect(typeof exports.fetchGzipped).toBe('function');
    expect(typeof exports.buildPackageUrl).toBe('function');
    expect(typeof exports.encodePackageName).toBe('function');
  });

  it('should export tar utilities', async () => {
    const exports = await import('../../src/utils/index.js');

    expect(typeof exports.extractTarToMap).toBe('function');
    expect(typeof exports.listTarFiles).toBe('function');
    expect(typeof exports.parseTarHeader).toBe('function');
  });

  it('should export fs utilities', async () => {
    const exports = await import('../../src/utils/index.js');

    expect(typeof exports.readTextFile).toBe('function');
    expect(typeof exports.writeTextFile).toBe('function');
    expect(typeof exports.ensureDir).toBe('function');
    expect(typeof exports.exists).toBe('function');
    expect(typeof exports.isFile).toBe('function');
    expect(typeof exports.isDirectory).toBe('function');
  });
});

describe('Plugins Index Exports (src/plugins/index.ts)', () => {
  it('should export core plugins', async () => {
    const exports = await import('../../src/plugins/index.js');

    expect(exports.dtsParserPlugin).toBeDefined();
    expect(exports.readmeParserPlugin).toBeDefined();
    expect(exports.llmsOutputPlugin).toBeDefined();
    expect(exports.markdownOutputPlugin).toBeDefined();
    expect(exports.jsonOutputPlugin).toBeDefined();
    expect(exports.corePlugins).toBeDefined();
    expect(exports.coreParserPlugins).toBeDefined();
    expect(exports.coreOutputPlugins).toBeDefined();
  });

  it('should export optional plugins', async () => {
    const exports = await import('../../src/plugins/index.js');

    expect(typeof exports.createClaudeProvider).toBe('function');
    expect(typeof exports.createOpenAIProvider).toBe('function');
    expect(typeof exports.createGeminiProvider).toBe('function');
    expect(typeof exports.createOllamaProvider).toBe('function');
    expect(typeof exports.createGroqProvider).toBe('function');
  });

  it('should export kernel utilities', async () => {
    const exports = await import('../../src/plugins/index.js');

    expect(typeof exports.createKernel).toBe('function');
    expect(typeof exports.definePlugin).toBe('function');
    expect(typeof exports.composePlugins).toBe('function');
  });
});

describe('Plugins Optional Index Exports (src/plugins/optional/index.ts)', () => {
  it('should export AI base functions', async () => {
    const exports = await import('../../src/plugins/optional/index.js');

    expect(typeof exports.createAIEnrichmentPlugin).toBe('function');
    expect(typeof exports.createSimpleProvider).toBe('function');
  });

  it('should export all AI providers', async () => {
    const exports = await import('../../src/plugins/optional/index.js');

    expect(typeof exports.createClaudeProvider).toBe('function');
    expect(typeof exports.createClaudePlugin).toBe('function');
    expect(typeof exports.createOpenAIProvider).toBe('function');
    expect(typeof exports.createOpenAIPlugin).toBe('function');
    expect(typeof exports.createGeminiProvider).toBe('function');
    expect(typeof exports.createGeminiPlugin).toBe('function');
    expect(typeof exports.checkGeminiAvailable).toBe('function');
    expect(typeof exports.createOllamaProvider).toBe('function');
    expect(typeof exports.createOllamaPlugin).toBe('function');
    expect(typeof exports.checkOllamaAvailable).toBe('function');
    expect(typeof exports.listOllamaModels).toBe('function');
    expect(typeof exports.createGroqProvider).toBe('function');
    expect(typeof exports.createGroqPlugin).toBe('function');
  });

  it('should export changelog parser', async () => {
    const exports = await import('../../src/plugins/optional/index.js');

    expect(typeof exports.parseChangelog).toBe('function');
    expect(typeof exports.findChangelog).toBe('function');
    expect(typeof exports.getLatestVersion).toBe('function');
    expect(typeof exports.getVersion).toBe('function');
    expect(typeof exports.formatChangelogEntry).toBe('function');
    expect(typeof exports.createChangelogParserPlugin).toBe('function');
  });

  it('should export HTML output', async () => {
    const exports = await import('../../src/plugins/optional/index.js');

    expect(typeof exports.generateHTML).toBe('function');
    expect(typeof exports.createHTMLOutputPlugin).toBe('function');
  });
});
