/**
 * Tests for src/parsers/readme.ts
 */

import { describe, it, expect } from 'vitest';
import {
  parseReadme,
  extractSections,
  extractCodeBlocks,
  extractInstallCommand,
  cleanMarkdown,
  truncateReadme,
} from '../../../src/parsers/readme.js';
import type { ParsedReadme } from '../../../src/types.js';

describe('parseReadme', () => {
  it('should parse a basic README', () => {
    const readme = `# My Package

A great package for doing things.

## Installation

\`\`\`bash
npm install my-package
\`\`\`

## Usage

\`\`\`javascript
const myPackage = require('my-package');
myPackage.doSomething();
\`\`\`
`;

    const result = parseReadme(readme);

    expect(result.title).toBe('My Package');
    expect(result.description).toBe('A great package for doing things.');
    expect(result.installation).toContain('npm install my-package');
    expect(result.quickStart).toBeDefined();
  });

  it('should extract badges', () => {
    const readme = `# Package

[![Build Status](https://img.shields.io/badge/build-passing-green)](https://ci.com)
[![NPM Version](https://img.shields.io/npm/v/package)](https://npm.com)

Some description.
`;

    const result = parseReadme(readme);

    expect(result.badges).toHaveLength(2);
    expect(result.badges).toContain('Build Status');
    expect(result.badges).toContain('NPM Version');
  });

  it('should extract examples section', () => {
    const readme = `# Package

## Examples

\`\`\`javascript
// Example 1
doSomething();
\`\`\`

\`\`\`typescript
// Example 2
doSomethingElse();
\`\`\`
`;

    const result = parseReadme(readme);

    expect(result.examples).toHaveLength(2);
  });

  it('should extract API section', () => {
    const readme = `# Package

## API Reference

myFunction - Does something useful.

anotherFunction - Does something else.
`;

    const result = parseReadme(readme);

    expect(result.api).toBeDefined();
    expect(result.api).toContain('myFunction');
    expect(result.api).toContain('anotherFunction');
  });

  it('should find quick start from code blocks when no Usage section', () => {
    const readme = `# Package

Install it:

\`\`\`bash
npm install pkg
\`\`\`

Then use it:

\`\`\`javascript
const pkg = require('pkg');
pkg.run();
\`\`\`
`;

    const result = parseReadme(readme);

    expect(result.quickStart).toBeDefined();
    // Should find JS code block as quick start
    expect(result.quickStart).toContain('require');
  });

  it('should include sections', () => {
    const readme = `# Package

## Installation

npm install

## Usage

Use it
`;

    const result = parseReadme(readme);

    // Should have Package, Installation, Usage sections
    expect(result.sections.length).toBeGreaterThanOrEqual(2);
    expect(result.sections.map(s => s.title)).toContain('Installation');
    expect(result.sections.map(s => s.title)).toContain('Usage');
  });
});

describe('extractSections', () => {
  it('should extract sections with correct levels', () => {
    const content = `# Main Title

Content here.

## Section 1

Section 1 content.

### Subsection 1.1

Subsection content.

## Section 2

Section 2 content.
`;

    const sections = extractSections(content);

    expect(sections).toHaveLength(4);
    expect(sections[0].title).toBe('Main Title');
    expect(sections[0].level).toBe(1);
    expect(sections[1].title).toBe('Section 1');
    expect(sections[1].level).toBe(2);
    expect(sections[2].title).toBe('Subsection 1.1');
    expect(sections[2].level).toBe(3);
    expect(sections[3].title).toBe('Section 2');
    expect(sections[3].level).toBe(2);
  });

  it('should handle empty content', () => {
    const sections = extractSections('');
    expect(sections).toHaveLength(0);
  });

  it('should include section content', () => {
    const content = `# Title

First paragraph.

Second paragraph.

## Next Section

Next content.
`;

    const sections = extractSections(content);

    expect(sections[0].content).toContain('First paragraph');
    expect(sections[0].content).toContain('Second paragraph');
    expect(sections[1].content).toContain('Next content');
  });

  it('should track start and end indices', () => {
    const content = `# Title

Content.

## Section

More content.`;

    const sections = extractSections(content);

    expect(sections[0].startIndex).toBe(0);
    expect(sections[0].endIndex).toBeGreaterThan(0);
    expect(sections[1].startIndex).toBeGreaterThan(sections[0].startIndex);
  });
});

describe('extractCodeBlocks', () => {
  it('should extract code blocks with language', () => {
    const content = `
Some text.

\`\`\`javascript
const x = 1;
\`\`\`

More text.

\`\`\`typescript
const y: number = 2;
\`\`\`
`;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toContain('```javascript');
    expect(blocks[0]).toContain('const x = 1');
    expect(blocks[1]).toContain('```typescript');
  });

  it('should extract code blocks without language', () => {
    const content = `
\`\`\`
plain code
\`\`\`
`;

    const blocks = extractCodeBlocks(content);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toBe('plain code');
  });

  it('should handle empty code blocks', () => {
    const content = `
\`\`\`javascript
\`\`\`
`;

    const blocks = extractCodeBlocks(content);

    // Empty blocks should be filtered out
    expect(blocks).toHaveLength(0);
  });

  it('should handle content without code blocks', () => {
    const blocks = extractCodeBlocks('Just plain text.');
    expect(blocks).toHaveLength(0);
  });
});

describe('extractInstallCommand', () => {
  it('should extract npm install command from plain text', () => {
    const content = 'Run npm install my-package to install.';
    const result = extractInstallCommand(content);
    expect(result).toBe('npm install my-package');
  });

  it('should extract npm i shorthand', () => {
    const content = 'Run npm i my-package';
    const result = extractInstallCommand(content);
    expect(result).toBe('npm i my-package');
  });

  it('should extract yarn add command', () => {
    const content = 'Or use yarn add my-package';
    const result = extractInstallCommand(content);
    expect(result).toBe('yarn add my-package');
  });

  it('should extract pnpm add command', () => {
    const content = 'pnpm add my-package';
    const result = extractInstallCommand(content);
    expect(result).toBe('pnpm add my-package');
  });

  it('should extract from code blocks', () => {
    const content = `
Install:

\`\`\`bash
npm install my-package
\`\`\`
`;

    const result = extractInstallCommand(content);
    expect(result).toBe('npm install my-package');
  });

  it('should extract with flags', () => {
    const content = 'npm install -D my-package';
    const result = extractInstallCommand(content);
    expect(result).toBe('npm install -D my-package');
  });

  it('should return undefined when no command found', () => {
    const content = 'This package is great!';
    const result = extractInstallCommand(content);
    expect(result).toBeUndefined();
  });
});

describe('cleanMarkdown', () => {
  it('should remove links', () => {
    const text = 'Check [this link](https://example.com) out.';
    const result = cleanMarkdown(text);
    expect(result).toBe('Check this link out.');
  });

  it('should remove bold', () => {
    const text = 'This is **bold** text.';
    const result = cleanMarkdown(text);
    expect(result).toBe('This is bold text.');
  });

  it('should remove italic', () => {
    const text = 'This is *italic* text.';
    const result = cleanMarkdown(text);
    expect(result).toBe('This is italic text.');
  });

  it('should remove underscore bold', () => {
    const text = 'This is __bold__ text.';
    const result = cleanMarkdown(text);
    expect(result).toBe('This is bold text.');
  });

  it('should remove underscore italic', () => {
    const text = 'This is _italic_ text.';
    const result = cleanMarkdown(text);
    expect(result).toBe('This is italic text.');
  });

  it('should remove strikethrough', () => {
    const text = 'This is ~~strikethrough~~ text.';
    const result = cleanMarkdown(text);
    expect(result).toBe('This is strikethrough text.');
  });

  it('should remove headings', () => {
    const text = '# Heading\nParagraph';
    const result = cleanMarkdown(text);
    expect(result).toBe('Heading\nParagraph');
  });

  it('should remove blockquotes', () => {
    const text = '> Quoted text';
    const result = cleanMarkdown(text);
    expect(result).toBe('Quoted text');
  });

  it('should remove bullet lists', () => {
    const text = '- Item 1\n* Item 2\n+ Item 3';
    const result = cleanMarkdown(text);
    expect(result).toBe('Item 1\nItem 2\nItem 3');
  });

  it('should remove numbered lists', () => {
    const text = '1. First\n2. Second';
    const result = cleanMarkdown(text);
    expect(result).toBe('First\nSecond');
  });

  it('should remove inline code', () => {
    const text = 'Run `command` now.';
    const result = cleanMarkdown(text);
    expect(result).toBe('Run  now.');
  });
});

describe('truncateReadme', () => {
  const createReadme = (overrides: Partial<ParsedReadme> = {}): ParsedReadme => ({
    title: 'Package',
    description: 'A description',
    badges: [],
    installation: 'npm install pkg',
    quickStart: 'const pkg = require("pkg");',
    examples: ['example1', 'example2'],
    api: 'API documentation here',
    sections: [],
    ...overrides,
  });

  it('should return unchanged if under limit', () => {
    const readme = createReadme();
    const result = truncateReadme(readme, 10000);

    expect(result).toEqual(readme);
  });

  it('should truncate examples first', () => {
    const readme = createReadme({
      examples: ['a'.repeat(100), 'b'.repeat(100)],
    });

    const result = truncateReadme(readme, 50);

    expect(result.examples).toHaveLength(0);
    expect(result.title).toBe('Package');
    expect(result.description).toBe('A description');
  });

  it('should truncate api after examples', () => {
    const readme = createReadme({
      api: 'a'.repeat(1000),
      examples: [],
    });

    const result = truncateReadme(readme, 50);

    expect(result.api).toBeUndefined();
  });

  it('should preserve high priority content', () => {
    const readme = createReadme({
      title: 'Important Title',
      description: 'Important Description',
      installation: 'npm i pkg',
      examples: ['x'.repeat(1000)],
      api: 'x'.repeat(1000),
    });

    const result = truncateReadme(readme, 100);

    expect(result.title).toBe('Important Title');
    expect(result.description).toBe('Important Description');
    expect(result.installation).toBe('npm i pkg');
  });

  it('should handle missing optional fields', () => {
    const readme: ParsedReadme = {
      title: 'Package',
      sections: [],
    };

    const result = truncateReadme(readme, 100);

    expect(result.title).toBe('Package');
  });
});

describe('parseReadme edge cases', () => {
  it('should handle Quick Start section variant', () => {
    const readme = `# Package

## Quick Start

\`\`\`javascript
quickCode();
\`\`\`
`;

    const result = parseReadme(readme);

    expect(result.quickStart).toContain('quickCode');
  });

  it('should handle Basic Usage section variant', () => {
    const readme = `# Package

## Basic Usage

\`\`\`javascript
basicCode();
\`\`\`
`;

    const result = parseReadme(readme);

    expect(result.quickStart).toBeDefined();
  });

  it('should clean description from markdown formatting', () => {
    const readme = `# Package

A **bold** and *italic* [linked](http://x.com) description.
`;

    const result = parseReadme(readme);

    expect(result.description).toBe('A bold and italic linked description.');
  });

  it('should handle multi-line description', () => {
    const readme = `# Package

This is the first line.
This is the second line.

## Section
`;

    const result = parseReadme(readme);

    expect(result.description).toContain('This is the first line');
    expect(result.description).toContain('This is the second line');
  });

  it('should extract title from non-h1 heading when no h1 exists', () => {
    const readme = `[![Badge](http://img.com/badge.png)](http://link.com)

## Section Title

Content here.
`;

    const result = parseReadme(readme);
    // Since first section is level 2, it should try to find title from lines
    expect(result.sections.length).toBeGreaterThan(0);
  });

  it('should skip badge-only lines when looking for title', () => {
    const readme = `![Badge](http://img.com/badge.png)
[![Another](http://img.com/another.png)](http://link.com)

# Real Title

Description here.
`;

    const result = parseReadme(readme);
    expect(result.title).toBe('Real Title');
  });

  it('should extract title from first non-badge non-empty line', () => {
    const readme = `![Badge](http://img.com/badge.png)

## Some Title

Content.
`;

    const result = parseReadme(readme);
    // First heading found should be used as title
    expect(result.sections[0]?.title).toBe('Some Title');
  });
});

describe('extractInstallCommand edge cases', () => {
  it('should extract pnpm add command', () => {
    // Note: patterns are checked in order, so use pnpm add (not pnpm install which contains npm install)
    const content = 'pnpm add my-package';
    const result = extractInstallCommand(content);
    expect(result).toBe('pnpm add my-package');
  });

  it('should extract install command from yarn add in code block', () => {
    const content = `
\`\`\`bash
yarn add my-package
\`\`\`
`;
    const result = extractInstallCommand(content);
    expect(result).toBe('yarn add my-package');
  });

  it('should extract install command from pnpm add in code block', () => {
    const content = `
\`\`\`bash
pnpm add my-package
\`\`\`
`;
    const result = extractInstallCommand(content);
    expect(result).toBe('pnpm add my-package');
  });

  it('should return undefined when code block contains no install command', () => {
    const content = `
\`\`\`bash
echo "hello"
\`\`\`
`;
    const result = extractInstallCommand(content);
    expect(result).toBeUndefined();
  });

  it('should extract npm install from multi-line code block', () => {
    const content = `
\`\`\`bash
# First comment
cd project
npm install my-package
echo "done"
\`\`\`
`;
    const result = extractInstallCommand(content);
    expect(result).toBe('npm install my-package');
  });

  it('should extract yarn add from multi-line code block', () => {
    const content = `
\`\`\`bash
# Install dependencies
yarn add my-package
# Done
\`\`\`
`;
    const result = extractInstallCommand(content);
    expect(result).toBe('yarn add my-package');
  });

  it('should extract pnpm add from multi-line code block', () => {
    const content = `
\`\`\`bash
pnpm add my-package
pnpm start
\`\`\`
`;
    const result = extractInstallCommand(content);
    expect(result).toBe('pnpm add my-package');
  });
});

describe('findQuickStartFromCode edge cases', () => {
  it('should find tsx code block as quick start', () => {
    const readme = `# Package

Install:

\`\`\`tsx
const Component = () => <div />;
\`\`\`
`;

    const result = parseReadme(readme);
    expect(result.quickStart).toContain('Component');
  });

  it('should find jsx code block as quick start', () => {
    const readme = `# Package

\`\`\`jsx
const App = () => <App />;
\`\`\`
`;

    const result = parseReadme(readme);
    expect(result.quickStart).toContain('App');
  });

  it('should find ts code block as quick start', () => {
    const readme = `# Package

\`\`\`ts
const x: number = 1;
\`\`\`
`;

    const result = parseReadme(readme);
    expect(result.quickStart).toContain('const x');
  });

  it('should find js code block as quick start', () => {
    const readme = `# Package

\`\`\`js
const y = 2;
\`\`\`
`;

    const result = parseReadme(readme);
    expect(result.quickStart).toContain('const y');
  });

  it('should fallback to any code block if no JS/TS found', () => {
    const readme = `# Package

\`\`\`python
print("hello")
\`\`\`
`;

    const result = parseReadme(readme);
    expect(result.quickStart).toContain('python');
  });

  it('should search after installation keyword', () => {
    const readme = `# Package

Some intro text.

## Installation

\`\`\`bash
npm install pkg
\`\`\`

\`\`\`javascript
const pkg = require('pkg');
\`\`\`
`;

    const result = parseReadme(readme);
    // Should find the JS code block after installation
    expect(result.quickStart).toContain('require');
  });
});

describe('extractBadges', () => {
  it('should extract image-only badges', () => {
    const readme = `# Package

![Build Status](http://img.com/build.png)
![Coverage](http://img.com/coverage.png)

Description.
`;

    const result = parseReadme(readme);
    expect(result.badges).toContain('Build Status');
    expect(result.badges).toContain('Coverage');
  });

  it('should skip badges without alt text', () => {
    const readme = `# Package

[![](http://img.com/no-alt.png)](http://link.com)

Description.
`;

    const result = parseReadme(readme);
    // Badge with empty alt should not be included
    expect(result.badges).not.toContain('');
  });
});

describe('truncateReadme additional cases', () => {
  it('should truncate sections when high-priority content exceeds limit', () => {
    const readme: ParsedReadme = {
      title: 'Title'.repeat(20), // 100 chars
      description: 'Description'.repeat(20), // 220 chars
      installation: 'Install'.repeat(10), // 70 chars
      quickStart: 'Quick'.repeat(10), // 50 chars
      api: 'API content',
      examples: ['example1', 'example2'],
      sections: [{ title: 'A', content: 'section content', level: 2, startIndex: 0, endIndex: 100 }],
    };

    // Total high-priority content > 50, so it will try to truncate
    const result = truncateReadme(readme, 50);
    // Low priority items (examples, api, sections) should be cleared
    expect(result.examples).toHaveLength(0);
    expect(result.api).toBeUndefined();
    expect(result.sections).toHaveLength(0);
  });
});
