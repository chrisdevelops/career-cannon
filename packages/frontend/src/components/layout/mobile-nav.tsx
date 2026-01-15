import { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { IconMenu2, IconX, IconHome } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SECTIONS, SUB_NAV, getActiveSection } from '@/lib/navigation';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const activeSection = getActiveSection(location.pathname);
  const subItems = SUB_NAV[activeSection];
  const hasSecondarySidebar = subItems.length > 0;

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <div className="md:hidden mr-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="text-foreground"
      >
        <IconMenu2 className="w-6 h-6" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 w-[280px] bg-[var(--sidebar)] z-50 transform transition-transform duration-300 ease-in-out border-r border-[var(--sidebar-border)] flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-[var(--layout-header-height)] border-b border-[var(--sidebar-border)] flex items-center justify-between px-4 shrink-0">
          <Link to="/" className="flex items-center gap-2 font-semibold text-[var(--sidebar-foreground)]">
            <IconHome className="w-6 h-6 shrink-0" />
            <span className="text-lg tracking-tight">Career Cannon</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] -mr-2"
          >
            <IconX className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {/* Global Navigation */}
          <div className="space-y-1">
            <h3 className="px-3 text-xs font-semibold text-[var(--sidebar-foreground)]/50 uppercase tracking-wider mb-2">
              Navigation
            </h3>
            {SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <Link
                  key={section.id}
                  to={section.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative group',
                    isActive
                      ? 'bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] font-medium'
                      : 'text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]'
                  )}
                >
                  <section.icon className="w-5 h-5 shrink-0" />
                  <span>{section.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Secondary Navigation */}
          {hasSecondarySidebar && (
            <div className="space-y-1">
              <h3 className="px-3 text-xs font-semibold text-[var(--sidebar-foreground)]/50 uppercase tracking-wider mb-2">
                {SECTIONS.find(s => s.id === activeSection)?.label}
              </h3>
              {subItems.map((item) => {
                const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + '/');
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)] font-medium'
                        : 'text-[var(--sidebar-foreground)] hover:text-[var(--sidebar-accent-foreground)] hover:bg-[var(--sidebar-accent)]/50'
                    )}
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
