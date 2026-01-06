import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  showCopyButton?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language = 'typescript',
  filename,
  showLineNumbers = true,
  showCopyButton = true,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.trim().split('\n');

  return (
    <div
      className={cn(
        'relative group rounded-xl overflow-hidden',
        'border border-border bg-card shadow-sm',
        'my-4',
        className
      )}
    >
      {/* IDE Header - macOS style */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted border-b border-border">
        <div className="flex items-center gap-3">
          {/* Traffic lights */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
            <div className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
          </div>
          {/* Filename or language */}
          {filename && (
            <span className="text-sm text-muted-foreground font-mono">
              {filename}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">
            {language}
          </span>
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs',
                'text-muted-foreground hover:text-foreground',
                'hover:bg-muted transition-colors'
              )}
              aria-label="Copy code"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Block */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed bg-transparent m-0 border-0">
          <code className={`language-${language}`}>
            {showLineNumbers ? (
              <table className="border-collapse w-full">
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="hover:bg-muted/50">
                      <td className="pr-4 pl-2 text-right text-muted-foreground select-none w-10 align-top">
                        {i + 1}
                      </td>
                      <td className="whitespace-pre">{line || ' '}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              code.trim()
            )}
          </code>
        </pre>
      </div>
    </div>
  );
}
