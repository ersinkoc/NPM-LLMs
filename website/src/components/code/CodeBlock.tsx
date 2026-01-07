import { useState, useEffect } from 'react';
import { Copy, Check, Palette, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { highlight } from '@oxog/codeshine';
import { useTheme } from '@/hooks/useTheme';

const themes = {
  dark: [
    'github-dark',
    'dracula',
    'vscode-dark',
    'monokai',
    'nord',
    'one-dark',
    'tokyo-night',
    'catppuccin-mocha',
  ],
  light: [
    'github-light',
    'vscode-light',
    'one-light',
    'solarized-light',
    'catppuccin-latte',
  ],
};

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = true,
  highlightLines = [],
}: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [copied, setCopied] = useState(false);
  const [html, setHtml] = useState<string>('');
  const [currentTheme, setCurrentTheme] = useState(
    resolvedTheme === 'light' ? 'github-light' : 'github-dark'
  );
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);

  const isLightTheme = themes.light.includes(currentTheme);

  useEffect(() => {
    setCurrentTheme(resolvedTheme === 'light' ? 'github-light' : 'github-dark');
  }, [resolvedTheme]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const decodedCode = code.replace(/\\`/g, '`').replace(/\\\$/g, '$');

  useEffect(() => {
    try {
      const highlighted = highlight(decodedCode, {
        language,
        theme: currentTheme,
        lineNumbers: showLineNumbers,
        highlightLines,
      });
      setHtml(highlighted);
    } catch (error) {
      console.error('Highlighting error:', error);
      const escaped = decodedCode
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      setHtml(`<pre class="p-4"><code>${escaped}</code></pre>`);
    }
  }, [decodedCode, language, currentTheme, showLineNumbers, highlightLines]);

  return (
    <div
      className={cn(
        'group relative my-4 overflow-hidden rounded-lg border',
        isLightTheme
          ? 'border-neutral-300 bg-white'
          : 'border-neutral-700/50 bg-[#1e1e1e]'
      )}
    >
      {/* Header with traffic lights */}
      {filename && (
        <div
          className={cn(
            'flex items-center justify-between border-b px-4 py-2',
            isLightTheme
              ? 'border-neutral-200 bg-neutral-50'
              : 'border-neutral-700/50 bg-[#252526]'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
            </div>
            <span
              className={cn(
                'ml-2 text-xs font-mono',
                isLightTheme ? 'text-neutral-600' : 'text-neutral-400'
              )}
            >
              {filename}
            </span>
          </div>
          <span
            className={cn(
              'text-xs uppercase',
              isLightTheme ? 'text-neutral-500' : 'text-neutral-500'
            )}
          >
            {language}
          </span>
        </div>
      )}

      <div className={cn('relative', isLightTheme ? 'bg-neutral-50' : 'bg-[#1e1e1e]')}>
        {/* Action bar */}
        <div
          className={cn(
            'flex items-center justify-between px-3 py-2 border-b',
            isLightTheme ? 'border-neutral-200' : 'border-neutral-700/30'
          )}
        >
          <span
            className={cn(
              'text-xs uppercase',
              isLightTheme ? 'text-neutral-500' : 'text-neutral-500'
            )}
          >
            {language}
          </span>

          <div className="flex items-center gap-2">
            {/* Theme dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowThemeDropdown(!showThemeDropdown)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
                  isLightTheme
                    ? 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-700/50'
                )}
              >
                <Palette className="h-3.5 w-3.5" />
                <span className="capitalize hidden sm:inline">
                  {currentTheme.replace(/-/g, ' ')}
                </span>
                <ChevronDown className="h-3 w-3" />
              </button>

              {showThemeDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowThemeDropdown(false)}
                  />
                  <div
                    className={cn(
                      'absolute right-0 top-full mt-1 z-20 w-48 rounded-md border shadow-xl max-h-64 overflow-y-auto',
                      isLightTheme
                        ? 'border-neutral-200 bg-white'
                        : 'border-neutral-700/50 bg-[#252526]'
                    )}
                  >
                    {/* Dark themes */}
                    <div className="p-1">
                      <div
                        className={cn(
                          'px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                          isLightTheme ? 'text-neutral-500' : 'text-neutral-500'
                        )}
                      >
                        Dark
                      </div>
                      {themes.dark.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setCurrentTheme(t);
                            setShowThemeDropdown(false);
                          }}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded text-xs capitalize transition-colors',
                            currentTheme === t
                              ? 'bg-blue-500/20 text-blue-400'
                              : isLightTheme
                                ? 'text-neutral-700 hover:bg-neutral-100'
                                : 'text-neutral-300 hover:bg-neutral-700/50'
                          )}
                        >
                          {t.replace(/-/g, ' ')}
                        </button>
                      ))}
                    </div>

                    {/* Light themes */}
                    <div
                      className={cn(
                        'border-t p-1',
                        isLightTheme ? 'border-neutral-200' : 'border-neutral-700/50'
                      )}
                    >
                      <div
                        className={cn(
                          'px-2 py-1 text-xs font-semibold uppercase tracking-wide',
                          isLightTheme ? 'text-neutral-500' : 'text-neutral-500'
                        )}
                      >
                        Light
                      </div>
                      {themes.light.map((t) => (
                        <button
                          key={t}
                          onClick={() => {
                            setCurrentTheme(t);
                            setShowThemeDropdown(false);
                          }}
                          className={cn(
                            'w-full text-left px-2 py-1.5 rounded text-xs capitalize transition-colors',
                            currentTheme === t
                              ? 'bg-blue-500/20 text-blue-400'
                              : isLightTheme
                                ? 'text-neutral-700 hover:bg-neutral-100'
                                : 'text-neutral-300 hover:bg-neutral-700/50'
                          )}
                        >
                          {t.replace(/-/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className={cn(
                'rounded p-1.5 opacity-0 transition-opacity group-hover:opacity-100',
                isLightTheme
                  ? 'text-neutral-600 hover:bg-neutral-200'
                  : 'text-neutral-400 hover:bg-neutral-700/50'
              )}
              aria-label="Copy code"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Highlighted Code */}
        <div
          className="codeshine-block overflow-x-auto text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
