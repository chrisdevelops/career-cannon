import React from 'react';
import { cn } from '@/lib/utils';
import { MobileNav } from './mobile-nav';

interface PageShellProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageShell({ children, className, ...props }: PageShellProps) {
  return (
    <div
      className={cn(
        "flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)] w-full overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface PageHeaderBarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PageHeaderBar({ children, className, ...props }: PageHeaderBarProps) {
  return (
    <header
      className={cn(
        "h-[var(--layout-header-height)] border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm sticky top-0 z-10 flex items-center px-[var(--layout-page-padding)]",
        className
      )}
      {...props}
    >
      <div className="w-full max-w-[var(--layout-max-width)] mx-auto flex items-center">
        <MobileNav />
        <div className="flex-1 flex items-center justify-between min-w-0">
          {children}
        </div>
      </div>
    </header>
  );
}

interface PageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function PageContent({ children, className, fullWidth = false, ...props }: PageContentProps) {
  return (
    <main
      className={cn(
        "flex-1 w-full px-[var(--layout-page-padding)] py-[var(--layout-page-padding)] overflow-auto",
        !fullWidth && "max-w-[var(--layout-max-width)] mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </main>
  );
}

interface PageFooterProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function PageFooter({ children, className, ...props }: PageFooterProps) {
  return (
    <footer
      className={cn(
        "h-[var(--page-footer-height)] border-t border-[var(--border)] bg-[var(--background)] flex items-center px-[var(--layout-page-padding)] mt-auto",
        className
      )}
      {...props}
    >
       <div className="w-full max-w-[var(--layout-max-width)] mx-auto">
        {children}
      </div>
    </footer>
  );
}
