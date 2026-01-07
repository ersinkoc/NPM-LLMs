# Tasks

Ordered implementation tasks for `@oxog/npm-llms`. Complete each task in order.

---

## Phase 1: Project Setup

### Task 1.1: Initialize Project Structure
- [ ] Create directory structure
- [ ] Create `.gitignore`
- [ ] Create `LICENSE` (MIT)
- [ ] Create initial `README.md`

### Task 1.2: Configure Package
- [ ] Create `package.json` with all fields
- [ ] Create `tsconfig.json` with strict mode
- [ ] Create `tsup.config.ts` for bundling
- [ ] Create `vitest.config.ts` with 100% coverage thresholds

### Task 1.3: Configure Linting & Formatting
- [ ] Create `.prettierrc`
- [ ] Create `eslint.config.js` (ESLint 9 flat config)

---

## Phase 2: Core Types & Errors

### Task 2.1: Define Types
- [ ] Create `src/types.ts` with all interfaces
- [ ] Export types from `src/index.ts`

### Task 2.2: Create Error Classes
- [ ] Create `src/errors.ts` with all error classes
- [ ] Export errors from `src/index.ts`

---

## Phase 3: Utilities (Zero Dependencies)

### Task 3.1: HTTP Utilities
- [ ] Create `src/utils/http.ts`
- [ ] Implement fetch wrapper with error handling
- [ ] Implement response validation

### Task 3.2: Tar Parser
- [ ] Create `src/utils/tar.ts`
- [ ] Implement tar header parsing
- [ ] Implement tar file extraction
- [ ] Handle path sanitization (security)

### Task 3.3: File System Utilities
- [ ] Create `src/utils/fs.ts`
- [ ] Implement async file operations
- [ ] Implement directory creation

---

## Phase 4: Core Kernel

### Task 4.1: Kernel Implementation
- [ ] Create `src/kernel.ts`
- [ ] Implement plugin registration (use)
- [ ] Implement plugin unregistration
- [ ] Implement event bus (on, emit)
- [ ] Implement plugin listing
- [ ] Implement error boundary

### Task 4.2: Token Counter
- [ ] Create `src/core/tokens.ts`
- [ ] Implement token counting algorithm
- [ ] Implement truncation with priorities

### Task 4.3: Cache System
- [ ] Create `src/core/cache.ts`
- [ ] Implement file-based cache
- [ ] Implement TTL support
- [ ] Implement cache stats
- [ ] Implement cache clearing

---

## Phase 5: NPM Fetcher

### Task 5.1: Package Fetcher
- [ ] Create `src/core/fetcher.ts`
- [ ] Implement metadata fetching
- [ ] Handle scoped packages (@scope/name)
- [ ] Handle version resolution
- [ ] Implement tarball download
- [ ] Integrate with tar extraction

---

## Phase 6: Parsers

### Task 6.1: JSDoc Parser
- [ ] Create `src/parsers/jsdoc.ts`
- [ ] Parse @param tags
- [ ] Parse @returns tags
- [ ] Parse @example tags
- [ ] Parse @deprecated, @since, @see tags
- [ ] Extract description

### Task 6.2: DTS Parser
- [ ] Create `src/parsers/dts.ts`
- [ ] Parse exported functions
- [ ] Parse exported constants
- [ ] Parse exported classes
- [ ] Parse exported interfaces
- [ ] Parse exported types
- [ ] Parse exported enums
- [ ] Integrate JSDoc comments

### Task 6.3: TypeScript Source Parser
- [ ] Create `src/parsers/typescript.ts`
- [ ] Parse source files when .d.ts unavailable
- [ ] Extract type information
- [ ] Extract JSDoc

### Task 6.4: README Parser
- [ ] Create `src/parsers/readme.ts`
- [ ] Extract package description
- [ ] Extract installation instructions
- [ ] Extract quick start examples
- [ ] Extract sections

---

## Phase 7: Output Generators

### Task 7.1: llms.txt Generator
- [ ] Create `src/outputs/llms.ts`
- [ ] Generate header with package info
- [ ] Generate install section
- [ ] Generate API summary
- [ ] Implement token limit truncation
- [ ] Implement priority-based content selection

### Task 7.2: llms-full.txt Generator
- [ ] Create `src/outputs/llms-full.ts`
- [ ] Generate complete API documentation
- [ ] Include all functions with full signatures
- [ ] Include all examples

### Task 7.3: Markdown Generator
- [ ] Create `src/outputs/markdown.ts`
- [ ] Generate API.md with proper formatting
- [ ] Include table of contents
- [ ] Include parameter tables
- [ ] Include code examples

### Task 7.4: JSON Generator
- [ ] Create `src/outputs/json.ts`
- [ ] Generate structured JSON output
- [ ] Include all metadata

---

## Phase 8: Core Plugins

### Task 8.1: Parser Plugins
- [ ] Create `src/plugins/core/dts-parser.ts`
- [ ] Create `src/plugins/core/ts-source-parser.ts`
- [ ] Create `src/plugins/core/jsdoc-parser.ts`
- [ ] Create `src/plugins/core/readme-parser.ts`

### Task 8.2: Output Plugins
- [ ] Create `src/plugins/core/llms-output.ts`
- [ ] Create `src/plugins/core/llms-full-output.ts`
- [ ] Create `src/plugins/core/markdown-output.ts`
- [ ] Create `src/plugins/core/json-output.ts`

### Task 8.3: Plugin Index
- [ ] Create `src/plugins/index.ts`
- [ ] Export all core plugins
- [ ] Export optional plugin types

---

## Phase 9: Optional Plugins

### Task 9.1: Changelog Parser
- [ ] Create `src/plugins/optional/changelog-parser.ts`
- [ ] Parse CHANGELOG.md format

### Task 9.2: HTML Output
- [ ] Create `src/plugins/optional/html-output.ts`
- [ ] Generate HTML documentation

### Task 9.3: AI Base
- [ ] Create `src/plugins/optional/ai-base.ts`
- [ ] Define AIProvider interface
- [ ] Implement common AI utilities

### Task 9.4: Claude Plugin
- [ ] Create `src/plugins/optional/claude-ai.ts`
- [ ] Implement Claude API client
- [ ] Implement enrichment prompts

### Task 9.5: OpenAI Plugin
- [ ] Create `src/plugins/optional/openai-ai.ts`
- [ ] Implement OpenAI API client
- [ ] Implement enrichment prompts

### Task 9.6: Gemini Plugin
- [ ] Create `src/plugins/optional/gemini-ai.ts`
- [ ] Implement Gemini API client
- [ ] Implement enrichment prompts

### Task 9.7: Ollama Plugin
- [ ] Create `src/plugins/optional/ollama-ai.ts`
- [ ] Implement Ollama API client
- [ ] Implement enrichment prompts

### Task 9.8: Groq Plugin
- [ ] Create `src/plugins/optional/groq-ai.ts`
- [ ] Implement Groq API client
- [ ] Implement enrichment prompts

---

## Phase 10: Main Extractor

### Task 10.1: Extractor Implementation
- [ ] Create `src/core/extractor.ts`
- [ ] Implement createExtractor factory
- [ ] Implement extract method
- [ ] Implement fetch method
- [ ] Integrate all plugins
- [ ] Handle options merging

### Task 10.2: Main Entry
- [ ] Create `src/index.ts`
- [ ] Export createExtractor
- [ ] Export all types
- [ ] Export all errors
- [ ] Export plugin utilities

---

## Phase 11: CLI

### Task 11.1: Argument Parser
- [ ] Create `src/cli/args.ts`
- [ ] Parse package name and version
- [ ] Parse output options
- [ ] Parse AI options
- [ ] Parse cache options

### Task 11.2: Commands
- [ ] Create `src/cli/commands.ts`
- [ ] Implement extract command
- [ ] Implement cache clear command
- [ ] Implement help command
- [ ] Implement version command

### Task 11.3: CLI Entry
- [ ] Create `src/cli/index.ts`
- [ ] Parse arguments
- [ ] Execute commands
- [ ] Handle errors gracefully
- [ ] Implement progress output

---

## Phase 12: Testing

### Task 12.1: Test Fixtures
- [ ] Create `tests/fixtures/sample-package/`
- [ ] Create sample .d.ts files
- [ ] Create sample package.json
- [ ] Create sample README.md
- [ ] Create mock API responses

### Task 12.2: Unit Tests - Utils
- [ ] Create `tests/unit/utils/tar.test.ts`
- [ ] Create `tests/unit/utils/http.test.ts`
- [ ] Create `tests/unit/utils/fs.test.ts`

### Task 12.3: Unit Tests - Core
- [ ] Create `tests/unit/kernel.test.ts`
- [ ] Create `tests/unit/core/tokens.test.ts`
- [ ] Create `tests/unit/core/cache.test.ts`
- [ ] Create `tests/unit/core/fetcher.test.ts`

### Task 12.4: Unit Tests - Parsers
- [ ] Create `tests/unit/parsers/jsdoc.test.ts`
- [ ] Create `tests/unit/parsers/dts.test.ts`
- [ ] Create `tests/unit/parsers/typescript.test.ts`
- [ ] Create `tests/unit/parsers/readme.test.ts`

### Task 12.5: Unit Tests - Outputs
- [ ] Create `tests/unit/outputs/llms.test.ts`
- [ ] Create `tests/unit/outputs/llms-full.test.ts`
- [ ] Create `tests/unit/outputs/markdown.test.ts`
- [ ] Create `tests/unit/outputs/json.test.ts`

### Task 12.6: Unit Tests - Plugins
- [ ] Test all core plugins
- [ ] Test all optional plugins

### Task 12.7: Integration Tests
- [ ] Create `tests/integration/extract.test.ts`
- [ ] Create `tests/integration/cli.test.ts`
- [ ] Test full extraction flow
- [ ] Test CLI commands

### Task 12.8: Coverage Verification
- [ ] Run coverage report
- [ ] Ensure 100% coverage
- [ ] Fix any gaps

---

## Phase 13: Examples

### Task 13.1: Basic Examples
- [ ] Create `examples/01-basic/minimal.ts`
- [ ] Create `examples/01-basic/with-options.ts`
- [ ] Create `examples/01-basic/README.md`

### Task 13.2: Format Examples
- [ ] Create `examples/02-formats/llms-only.ts`
- [ ] Create `examples/02-formats/all-formats.ts`
- [ ] Create `examples/02-formats/README.md`

### Task 13.3: AI Examples
- [ ] Create `examples/03-ai-enrichment/with-claude.ts`
- [ ] Create `examples/03-ai-enrichment/with-openai.ts`
- [ ] Create `examples/03-ai-enrichment/with-ollama.ts`
- [ ] Create `examples/03-ai-enrichment/README.md`

### Task 13.4: Plugin Examples
- [ ] Create `examples/04-plugins/custom-parser.ts`
- [ ] Create `examples/04-plugins/custom-output.ts`
- [ ] Create `examples/04-plugins/README.md`

### Task 13.5: CLI Examples
- [ ] Create `examples/05-cli/basic-usage.sh`
- [ ] Create `examples/05-cli/with-ai.sh`
- [ ] Create `examples/05-cli/README.md`

### Task 13.6: Real-World Examples
- [ ] Create `examples/06-real-world/generate-for-cursor/`
- [ ] Create `examples/06-real-world/batch-extraction/`
- [ ] Create `examples/06-real-world/README.md`

---

## Phase 14: Documentation

### Task 14.1: llms.txt
- [ ] Create `llms.txt` (< 2000 tokens)
- [ ] Include package summary
- [ ] Include install instructions
- [ ] Include API summary
- [ ] Include common patterns
- [ ] Include error codes

### Task 14.2: README.md
- [ ] Write complete README
- [ ] Include badges (npm, coverage, license)
- [ ] Include quick start
- [ ] Include API reference
- [ ] Include examples
- [ ] Optimize first 500 tokens for LLMs

### Task 14.3: CHANGELOG.md
- [ ] Create CHANGELOG.md
- [ ] Document v1.0.0 features

---

## Phase 15: Website

### Task 15.1: Website Setup
- [ ] Create `website/` directory
- [ ] Initialize Vite + React 19 project
- [ ] Install Tailwind CSS v4
- [ ] Install shadcn/ui
- [ ] Install @oxog/codeshine
- [ ] Configure routing

### Task 15.2: Layout Components
- [ ] Create `Header.tsx` with navigation
- [ ] Create `Footer.tsx` with credits
- [ ] Create `Sidebar.tsx` for docs
- [ ] Create `Layout.tsx` wrapper

### Task 15.3: Common Components
- [ ] Create `ThemeToggle.tsx`
- [ ] Create `CopyButton.tsx`
- [ ] Create `GitHubStar.tsx`
- [ ] Create `InstallTabs.tsx`

### Task 15.4: Code Components
- [ ] Create `CodeBlock.tsx` with IDE style
- [ ] Integrate @oxog/codeshine
- [ ] Sync themes with app

### Task 15.5: Pages
- [ ] Create `Home.tsx` landing page
- [ ] Create docs pages (Introduction, Installation, QuickStart)
- [ ] Create API reference pages
- [ ] Create Examples page
- [ ] Create Plugins page

### Task 15.6: Website Polish
- [ ] Add CNAME file
- [ ] Copy llms.txt to public
- [ ] Add favicon
- [ ] Add Open Graph image
- [ ] Test responsive design
- [ ] Run Lighthouse audit

---

## Phase 16: Final Steps

### Task 16.1: Build Verification
- [ ] Run `npm run build`
- [ ] Verify no TypeScript errors
- [ ] Verify bundle sizes

### Task 16.2: Test Verification
- [ ] Run `npm run test:coverage`
- [ ] Verify 100% coverage
- [ ] Verify all tests pass

### Task 16.3: CLI Verification
- [ ] Test CLI with real packages
- [ ] Verify all options work
- [ ] Verify error handling

### Task 16.4: Documentation Review
- [ ] Review all docs for accuracy
- [ ] Verify all examples run
- [ ] Check all links work

### Task 16.5: Website Build
- [ ] Run website build
- [ ] Verify all pages work
- [ ] Deploy to GitHub Pages

### Task 16.6: GitHub Actions
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Test workflow

### Task 16.7: Final Checklist
- [ ] All tests pass
- [ ] 100% coverage
- [ ] Zero runtime dependencies
- [ ] Bundle size within limits
- [ ] Website deployed
- [ ] README complete
- [ ] llms.txt complete
- [ ] Examples all work
- [ ] CLI works correctly

---

## Summary

| Phase | Tasks | Estimated Files |
|-------|-------|-----------------|
| 1. Setup | 3 | 7 |
| 2. Types | 2 | 2 |
| 3. Utils | 3 | 3 |
| 4. Kernel | 3 | 3 |
| 5. Fetcher | 1 | 1 |
| 6. Parsers | 4 | 4 |
| 7. Outputs | 4 | 4 |
| 8. Core Plugins | 3 | 9 |
| 9. Optional Plugins | 8 | 8 |
| 10. Extractor | 2 | 2 |
| 11. CLI | 3 | 3 |
| 12. Testing | 8 | 15+ |
| 13. Examples | 6 | 15+ |
| 14. Docs | 3 | 3 |
| 15. Website | 6 | 20+ |
| 16. Final | 7 | 1 |

**Total: ~67 tasks, ~100+ files**
