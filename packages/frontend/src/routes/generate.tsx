import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { IconFileText, IconMail } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/generate')({
  component: GenerateLayout,
});

function GenerateLayout() {
  const location = useLocation();
  const isResume = location.pathname.includes('/resume');
  const isCoverLetter = location.pathname.includes('/cover-letter');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-xl font-semibold">
              Career Cannon
            </Link>
            <nav className="flex gap-1">
              <Link
                to="/generate/resume"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isResume
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <IconFileText className="w-4 h-4" />
                Resume
              </Link>
              <Link
                to="/generate/cover-letter"
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  isCoverLetter
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <IconMail className="w-4 h-4" />
                Cover Letter
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
