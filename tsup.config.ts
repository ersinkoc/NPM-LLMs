import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/plugins/index.ts', 'src/cli/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  shims: true,
  target: 'node18',
  outDir: 'dist',
  onSuccess: async () => {
    // Add shebang to CLI files
    const fs = await import('fs/promises');
    const cliFiles = ['dist/cli/index.js', 'dist/cli/index.cjs'];
    for (const file of cliFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        if (!content.startsWith('#!')) {
          await fs.writeFile(file, `#!/usr/bin/env node\n${content}`);
        }
      } catch {
        // File may not exist
      }
    }
  },
});
