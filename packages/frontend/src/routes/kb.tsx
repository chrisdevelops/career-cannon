import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import {
  IconUser,
  IconBriefcase,
  IconStar,
  IconCode,
  IconSchool,
  IconMicrophone,
  IconHome,
  IconFileUpload,
  IconHistory,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/kb')({
  component: KBLayout,
});

const navItems = [
  { to: '/kb/profile', icon: IconUser, label: 'Profile' },
  { to: '/kb/roles', icon: IconBriefcase, label: 'Roles & Experience' },
  { to: '/kb/skills', icon: IconCode, label: 'Skills' },
  { to: '/kb/projects', icon: IconStar, label: 'Projects' },
  { to: '/kb/education', icon: IconSchool, label: 'Education' },
  { to: '/kb/voice', icon: IconMicrophone, label: 'Voice Blueprint' },
  { to: '/import', icon: IconFileUpload, label: 'Import Resume' },
  { to: '/history', icon: IconHistory, label: 'Change History' },
];

function KBLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold">
            <IconHome className="w-5 h-5" />
            Career Cannon
          </Link>
        </div>

        <nav className="flex-1 p-2">
          <div className="text-xs font-medium text-muted-foreground px-3 py-2">
            Knowledge Base
          </div>
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t">
          <Link
            to="/generate/resume"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Generate Resume
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
