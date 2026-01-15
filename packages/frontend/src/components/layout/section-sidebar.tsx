import { Link, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface SectionSidebarProps {
  title: string;
  items: { to: string; label: string; icon: any }[];
}

export function SectionSidebar({ title, items }: SectionSidebarProps) {
  const location = useLocation();

  return (
    <aside className="w-[var(--sidebar-width-secondary)] border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] flex flex-col z-10 animate-in slide-in-from-left-2 duration-200">
      <div className="h-[var(--layout-header-height)] border-b border-[var(--sidebar-border)] flex items-center px-4 shrink-0">
        <h2 className="font-semibold text-lg tracking-tight text-[var(--sidebar-foreground)] truncate" title={title}>{title}</h2>
      </div>
      <nav className="flex-1 p-2 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors mb-1',
                isActive
                  ? 'bg-[var(--sidebar-accent)] font-medium text-[var(--sidebar-accent-foreground)]'
                  : 'text-[var(--sidebar-foreground)] hover:text-[var(--sidebar-accent-foreground)] hover:bg-[var(--sidebar-accent)]/50'
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
