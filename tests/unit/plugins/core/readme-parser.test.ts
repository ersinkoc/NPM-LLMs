/**
 * README Parser Plugin tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readmeParserPlugin } from '../../../../src/plugins/core/readme-parser.js';
import type { ExtractorContext } from '../../../../src/types.js';

// Mock the readme parser
vi.mock('../../../../src/parsers/readme.js', () => ({
  parseReadme: vi.fn(),
}));

import { parseReadme } from '../../../../src/parsers/readme.js';

const mockedParseReadme = vi.mocked(parseReadme);

describe('readmeParserPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(readmeParserPlugin.name).toBe('readme-parser');
    expect(readmeParserPlugin.version).toBe('1.0.0');
    expect(readmeParserPlugin.category).toBe('parser');
  });

  it('should find README.md (uppercase)', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test Package',
      description: 'A test package',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['README.md', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).toHaveBeenCalledWith('# Test');
    expect(context.readme).toBeDefined();
  });

  it('should find readme.md (lowercase)', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['readme.md', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).toHaveBeenCalled();
  });

  it('should find Readme.md (mixed case)', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['Readme.md', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).toHaveBeenCalled();
  });

  it('should find README.MD (all caps)', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['README.MD', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).toHaveBeenCalled();
  });

  it('should find README without extension', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['README', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).toHaveBeenCalled();
  });

  it('should find readme without extension (lowercase)', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['readme', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).toHaveBeenCalled();
  });

  it('should find readme by searching file paths', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([
          ['package.json', '{}'],
          ['docs/readme.txt', '# Test'],
        ]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).toHaveBeenCalledWith('# Test');
  });

  it('should skip when no readme found', async () => {
    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['package.json', '{}']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(mockedParseReadme).not.toHaveBeenCalled();
    expect(context.readme).toBeUndefined();
  });

  it('should update package description from readme', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      description: 'From readme',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['README.md', '# Test\nFrom readme']]),
        description: undefined,
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(context.package!.description).toBe('From readme');
  });

  it('should not override existing package description', async () => {
    mockedParseReadme.mockReturnValue({
      title: 'Test',
      description: 'From readme',
      sections: [],
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['README.md', '# Test']]),
        description: 'Original description',
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(context.package!.description).toBe('Original description');
  });

  it('should handle parse errors gracefully', async () => {
    mockedParseReadme.mockImplementation(() => {
      throw new Error('Parse error');
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['README.md', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await expect(handler(context)).resolves.not.toThrow();
    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('Parse error');
  });

  it('should handle non-Error parse errors', async () => {
    mockedParseReadme.mockImplementation(() => {
      throw 'string error';
    });

    const kernel = {
      on: vi.fn(),
    };

    readmeParserPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      package: {
        name: 'test-package',
        version: '1.0.0',
        files: new Map([['README.md', '# Test']]),
      },
      readme: undefined,
      errors: [],
    };

    await handler(context);

    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('string error');
  });
});
