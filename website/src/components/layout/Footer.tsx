import { PACKAGE_NAME, GITHUB_URL, NPM_URL, AUTHOR } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-background)]">
      <div className="container py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <h3 className="font-semibold text-lg mb-2">{PACKAGE_NAME}</h3>
            <p className="text-sm text-[var(--color-muted-foreground)] max-w-md">
              Zero-dependency NPM package documentation extractor for LLMs. Generate llms.txt,
              llms-full.txt, and AI-ready documentation from any NPM package.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-3">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/docs" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                  Documentation
                </a>
              </li>
              <li>
                <a href="/api" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                  API Reference
                </a>
              </li>
              <li>
                <a href="/examples" className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                  Examples
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-3">Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  npm
                </a>
              </li>
              <li>
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
                >
                  Issues
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[var(--color-border)] flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            &copy; {new Date().getFullYear()} {AUTHOR}. Released under the MIT License.
          </p>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Built with React, Vite, and Tailwind CSS
          </p>
        </div>
      </div>
    </footer>
  );
}
