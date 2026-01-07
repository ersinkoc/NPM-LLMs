/**
 * llms.txt Output Plugin tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { llmsOutputPlugin } from '../../../../src/plugins/core/llms-output.js';
import type { ExtractorContext } from '../../../../src/types.js';

// Mock the llms output generator
vi.mock('../../../../src/outputs/llms.js', () => ({
  generateLlmsTxt: vi.fn(),
  DEFAULT_LLMS_TOKEN_LIMIT: 10000,
}));

import { generateLlmsTxt, DEFAULT_LLMS_TOKEN_LIMIT } from '../../../../src/outputs/llms.js';

const mockedGenerateLlmsTxt = vi.mocked(generateLlmsTxt);

describe('llmsOutputPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(llmsOutputPlugin.name).toBe('llms-output');
    expect(llmsOutputPlugin.version).toBe('1.0.0');
    expect(llmsOutputPlugin.category).toBe('output');
  });

  it('should skip when llms format not requested', async () => {
    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: {
        formats: ['json', 'markdown'],
      },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsTxt).not.toHaveBeenCalled();
    expect(context.outputs!.has('llms')).toBe(false);
  });

  it('should skip when formats is undefined', async () => {
    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: {},
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsTxt).not.toHaveBeenCalled();
  });

  it('should generate llms.txt when format requested', async () => {
    mockedGenerateLlmsTxt.mockReturnValue('# Package\n...');

    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const outputs = new Map();
    const context: Partial<ExtractorContext> = {
      options: {
        formats: ['llms'],
      },
      outputs,
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsTxt).toHaveBeenCalled();
    expect(outputs.get('llms')).toBe('# Package\n...');
  });

  it('should use default token limit', async () => {
    mockedGenerateLlmsTxt.mockReturnValue('# Package');

    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: {
        formats: ['llms'],
      },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsTxt).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        tokenLimit: DEFAULT_LLMS_TOKEN_LIMIT,
      })
    );
  });

  it('should use custom token limit from options', async () => {
    mockedGenerateLlmsTxt.mockReturnValue('# Package');

    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: {
        formats: ['llms'],
        llmsTokenLimit: 5000,
      },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsTxt).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        tokenLimit: 5000,
      })
    );
  });

  it('should pass includeInstall and includeQuickStart options', async () => {
    mockedGenerateLlmsTxt.mockReturnValue('# Package');

    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: {
        formats: ['llms'],
      },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsTxt).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        includeInstall: true,
        includeQuickStart: true,
      })
    );
  });

  it('should handle generation errors gracefully', async () => {
    mockedGenerateLlmsTxt.mockImplementation(() => {
      throw new Error('Generation error');
    });

    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: {
        formats: ['llms'],
      },
      outputs: new Map(),
      errors: [],
    };

    await expect(handler(context)).resolves.not.toThrow();
    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('Generation error');
  });

  it('should handle non-Error generation errors', async () => {
    mockedGenerateLlmsTxt.mockImplementation(() => {
      throw 'string error';
    });

    const kernel = {
      on: vi.fn(),
    };

    llmsOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: {
        formats: ['llms'],
      },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('string error');
  });
});

// Additional tests for json-output, llms-full-output, and markdown-output plugins
import { jsonOutputPlugin } from '../../../../src/plugins/core/json-output.js';
import { llmsFullOutputPlugin } from '../../../../src/plugins/core/llms-full-output.js';
import { markdownOutputPlugin } from '../../../../src/plugins/core/markdown-output.js';

vi.mock('../../../../src/outputs/json.js', () => ({
  generateJson: vi.fn(),
}));

vi.mock('../../../../src/outputs/llms-full.js', () => ({
  generateLlmsFullTxt: vi.fn(),
}));

vi.mock('../../../../src/outputs/markdown.js', () => ({
  generateMarkdown: vi.fn(),
}));

import { generateJson } from '../../../../src/outputs/json.js';
import { generateLlmsFullTxt } from '../../../../src/outputs/llms-full.js';
import { generateMarkdown } from '../../../../src/outputs/markdown.js';

const mockedGenerateJson = vi.mocked(generateJson);
const mockedGenerateLlmsFullTxt = vi.mocked(generateLlmsFullTxt);
const mockedGenerateMarkdown = vi.mocked(generateMarkdown);

describe('jsonOutputPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(jsonOutputPlugin.name).toBe('json-output');
    expect(jsonOutputPlugin.version).toBe('1.0.0');
    expect(jsonOutputPlugin.category).toBe('output');
  });

  it('should skip when json format not requested', async () => {
    const kernel = { on: vi.fn() };
    jsonOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['llms'] },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateJson).not.toHaveBeenCalled();
  });

  it('should generate json output', async () => {
    mockedGenerateJson.mockReturnValue('{"api":[]}');

    const kernel = { on: vi.fn() };
    jsonOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['json'] },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateJson).toHaveBeenCalled();
    expect(context.outputs!.get('json')).toBe('{"api":[]}');
  });

  it('should handle json generation errors', async () => {
    mockedGenerateJson.mockImplementation(() => {
      throw new Error('JSON error');
    });

    const kernel = { on: vi.fn() };
    jsonOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['json'] },
      outputs: new Map(),
      errors: [],
    };

    await expect(handler(context)).resolves.not.toThrow();
    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('JSON error');
  });

  it('should handle non-Error json generation errors', async () => {
    mockedGenerateJson.mockImplementation(() => {
      throw 'string error';
    });

    const kernel = { on: vi.fn() };
    jsonOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['json'] },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(context.errors![0].message).toBe('string error');
  });
});

describe('llmsFullOutputPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(llmsFullOutputPlugin.name).toBe('llms-full-output');
    expect(llmsFullOutputPlugin.version).toBe('1.0.0');
    expect(llmsFullOutputPlugin.category).toBe('output');
  });

  it('should skip when llms-full format not requested', async () => {
    const kernel = { on: vi.fn() };
    llmsFullOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['llms'] },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsFullTxt).not.toHaveBeenCalled();
  });

  it('should generate llms-full output', async () => {
    mockedGenerateLlmsFullTxt.mockReturnValue('# Full API');

    const kernel = { on: vi.fn() };
    llmsFullOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['llms-full'] },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateLlmsFullTxt).toHaveBeenCalled();
    expect(context.outputs!.get('llms-full')).toBe('# Full API');
  });

  it('should handle llms-full generation errors', async () => {
    mockedGenerateLlmsFullTxt.mockImplementation(() => {
      throw new Error('LLMs full error');
    });

    const kernel = { on: vi.fn() };
    llmsFullOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['llms-full'] },
      outputs: new Map(),
      errors: [],
    };

    await expect(handler(context)).resolves.not.toThrow();
    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('LLMs full error');
  });

  it('should handle non-Error llms-full generation errors', async () => {
    mockedGenerateLlmsFullTxt.mockImplementation(() => {
      throw 'string error';
    });

    const kernel = { on: vi.fn() };
    llmsFullOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['llms-full'] },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(context.errors![0].message).toBe('string error');
  });
});

describe('markdownOutputPlugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have correct metadata', () => {
    expect(markdownOutputPlugin.name).toBe('markdown-output');
    expect(markdownOutputPlugin.version).toBe('1.0.0');
    expect(markdownOutputPlugin.category).toBe('output');
  });

  it('should skip when markdown format not requested', async () => {
    const kernel = { on: vi.fn() };
    markdownOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['json'] },
      outputs: new Map(),
      errors: [],
    };

    await handler(context);

    expect(mockedGenerateMarkdown).not.toHaveBeenCalled();
  });

  it('should generate markdown output', async () => {
    mockedGenerateMarkdown.mockReturnValue('# API Docs');

    const kernel = { on: vi.fn() };
    markdownOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['markdown'] },
      outputs: new Map(),
      errors: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map(),
      },
    };

    await handler(context);

    expect(mockedGenerateMarkdown).toHaveBeenCalled();
    expect(context.outputs!.get('markdown')).toBe('# API Docs');
  });

  it('should extract repository URL from package', async () => {
    mockedGenerateMarkdown.mockReturnValue('# API Docs');

    const kernel = { on: vi.fn() };
    markdownOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['markdown'] },
      outputs: new Map(),
      errors: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map(),
        repository: {
          type: 'git',
          url: 'git+https://github.com/user/repo.git',
        },
      },
    };

    await handler(context);

    expect(mockedGenerateMarkdown).toHaveBeenCalledWith(
      context,
      expect.objectContaining({
        repositoryUrl: 'https://github.com/user/repo',
      })
    );
  });

  it('should handle markdown generation errors', async () => {
    mockedGenerateMarkdown.mockImplementation(() => {
      throw new Error('Markdown error');
    });

    const kernel = { on: vi.fn() };
    markdownOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['markdown'] },
      outputs: new Map(),
      errors: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map(),
      },
    };

    await expect(handler(context)).resolves.not.toThrow();
    expect(context.errors).toHaveLength(1);
    expect(context.errors![0].message).toBe('Markdown error');
  });

  it('should handle non-Error markdown generation errors', async () => {
    mockedGenerateMarkdown.mockImplementation(() => {
      throw 'string error';
    });

    const kernel = { on: vi.fn() };
    markdownOutputPlugin.install(kernel as any);

    const handler = kernel.on.mock.calls[0][1];
    const context: Partial<ExtractorContext> = {
      options: { formats: ['markdown'] },
      outputs: new Map(),
      errors: [],
      package: {
        name: 'test',
        version: '1.0.0',
        files: new Map(),
      },
    };

    await handler(context);

    expect(context.errors![0].message).toBe('string error');
  });
});
