import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { clsx } from 'clsx';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={clsx(
        'p-2 rounded-md transition-colors',
        copied
          ? 'text-green-500 bg-green-500/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        className
      )}
      aria-label={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
