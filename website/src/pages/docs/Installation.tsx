import { Sidebar } from '@/components/layout/Sidebar';
import { CodeBlock } from '@/components/code/CodeBlock';
import { PACKAGE_NAME } from '@/lib/constants';

const npmInstall = `npm install ${PACKAGE_NAME}`;

const yarnInstall = `yarn add ${PACKAGE_NAME}`;

const pnpmInstall = `pnpm add ${PACKAGE_NAME}`;

const globalInstall = `npm install -g ${PACKAGE_NAME}`;

const npxUsage = `npx ${PACKAGE_NAME} extract lodash`;

export function DocsInstallation() {
  return (
    <div className="container py-12">
      <div className="flex gap-12">
        <Sidebar />

        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl font-bold mb-4">Installation</h1>
          <p className="text-xl text-[var(--color-muted-foreground)] mb-8">
            Install {PACKAGE_NAME} using your preferred package manager.
          </p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Package Installation</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Add {PACKAGE_NAME} to your project as a dependency:
              </p>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">npm</h4>
                  <CodeBlock code={npmInstall} language="bash" showLineNumbers={false} />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">yarn</h4>
                  <CodeBlock code={yarnInstall} language="bash" showLineNumbers={false} />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">pnpm</h4>
                  <CodeBlock code={pnpmInstall} language="bash" showLineNumbers={false} />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Global Installation</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Install globally to use the CLI from anywhere:
              </p>
              <CodeBlock code={globalInstall} language="bash" showLineNumbers={false} />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Using npx</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                Run without installation using npx:
              </p>
              <CodeBlock code={npxUsage} language="bash" showLineNumbers={false} />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Requirements</h2>
              <ul className="space-y-2 text-[var(--color-muted-foreground)]">
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  Node.js 18.0.0 or higher
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-[var(--color-primary)]">•</span>
                  npm, yarn, or pnpm
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Verify Installation</h2>
              <p className="text-[var(--color-muted-foreground)] mb-4">
                After installation, verify it works:
              </p>
              <CodeBlock
                code="npx @oxog/npm-llms --version"
                language="bash"
                showLineNumbers={false}
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
