import React from 'react';
import { cn } from '@/lib/utils';

export interface PageTitleBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
}

export function PageTitleBar({ 
  title, 
  subtitle, 
  actions,
  leading,
  className,
  ...props 
}: PageTitleBarProps) {
  return (
    <div 
      className={cn("flex items-center justify-between w-full", className)} 
      {...props}
    >
      <div className="flex items-center gap-4">
        {leading}
        <div className="flex flex-col gap-0.5">
          <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && (
            <div className="text-sm text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
