import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { IconHome, IconChevronRight, IconChevronLeft } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { SECTIONS } from '@/lib/navigation';
import type { NavSection } from '@/lib/navigation';
import { Button } from '@/components/ui/button';

interface GlobalSidebarProps {
  activeSection: NavSection;
}

export function GlobalSidebar({ activeSection }: GlobalSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleSidebar = () => setIsExpanded(!isExpanded);

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-all duration-300 z-20 overflow-hidden relative",
        isExpanded ? "w-[var(--sidebar-width-expanded)]" : "w-[var(--sidebar-width-collapsed)]"
      )}
    >
      {/* Header / Home Link */}
      <div className="h-[var(--layout-header-height)] border-b border-[var(--sidebar-border)] flex items-center px-4 shrink-0 overflow-hidden whitespace-nowrap">
        <Link to="/" className="flex items-center gap-2 font-semibold text-[var(--sidebar-foreground)]">
          <IconHome className="w-6 h-6 shrink-0" />
          <span
            className={cn(
              "text-lg tracking-tight transition-opacity duration-300",
              isExpanded ? "opacity-100" : "opacity-0 hidden"
            )}
          >
            Career Cannon
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto overflow-x-hidden">
        {SECTIONS.map((section) => {
          const isActive = activeSection === section.id;
          return (
            <Link
              key={section.id}
              to={section.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md transition-colors relative group whitespace-nowrap',
                isActive
                  ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]'
                  : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]',
                !isExpanded && 'justify-center px-2'
              )}
              title={!isExpanded ? section.label : undefined}
            >
              <section.icon className={cn("shrink-0", isExpanded ? "w-5 h-5" : "w-6 h-6")} />
              <span
                className={cn(
                  "text-sm font-medium transition-all duration-300",
                  isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 absolute left-10 hidden"
                )}
              >
                {section.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Toggle */}
      <div className="p-2 border-t border-[var(--sidebar-border)] shrink-0 flex justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center hover:bg-[var(--sidebar-accent)] text-[var(--sidebar-foreground)]"
          title={isExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isExpanded ? <IconChevronLeft className="w-5 h-5" /> : <IconChevronRight className="w-5 h-5" />}
        </Button>
      </div>
    </aside>
  );
}
