import { useState } from 'react';
import { clsx } from 'clsx';
import { CopyButton } from './CopyButton';

const packageManagers = [
  { id: 'npm', label: 'npm', command: 'npm install @oxog/npm-llms' },
  { id: 'yarn', label: 'yarn', command: 'yarn add @oxog/npm-llms' },
  { id: 'pnpm', label: 'pnpm', command: 'pnpm add @oxog/npm-llms' },
  { id: 'bun', label: 'bun', command: 'bun add @oxog/npm-llms' },
];

export function InstallTabs() {
  const [activeTab, setActiveTab] = useState('npm');
  const activeManager = packageManagers.find((pm) => pm.id === activeTab)!;

  return (
    <div className="rounded-lg border bg-muted overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b bg-muted/50">
        {packageManagers.map((pm) => (
          <button
            key={pm.id}
            onClick={() => setActiveTab(pm.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === pm.id
                ? 'text-primary-500 border-b-2 border-primary-500 -mb-px bg-background'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {pm.label}
          </button>
        ))}
      </div>

      {/* Command */}
      <div className="flex items-center justify-between p-4">
        <code className="text-sm font-mono">{activeManager.command}</code>
        <CopyButton text={activeManager.command} />
      </div>
    </div>
  );
}
