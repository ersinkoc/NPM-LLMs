import { Link, useLocation } from 'react-router-dom';
import { DOCS_SIDEBAR } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <nav className="sticky top-24 space-y-6">
        {DOCS_SIDEBAR.map((section) => (
          <div key={section.title}>
            <h4 className="font-medium text-sm mb-2">{section.title}</h4>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={cn(
                      'block px-3 py-1.5 text-sm rounded-md transition-colors hover:no-underline',
                      location.pathname === item.href
                        ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-medium border-l-2 border-[var(--color-primary)]'
                        : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
