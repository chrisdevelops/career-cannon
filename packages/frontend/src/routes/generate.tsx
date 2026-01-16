import { createFileRoute, Outlet } from '@tanstack/react-router';
import { PageContent, PageHeaderBar, PageShell } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { AppLayout } from '@/components/app-layout';

export const Route = createFileRoute('/generate')({
  component: GenerateLayout,
});

function GenerateLayout() {
  return (
    <AppLayout>
      <PageShell>
        <PageHeaderBar>
          <PageTitleBar
            title="Generate"
            subtitle="Create tailored resumes and cover letters."
          />
        </PageHeaderBar>
        <PageContent fullWidth className="overflow-hidden pb-0">
          <Outlet />
        </PageContent>
      </PageShell>
    </AppLayout>
  );
}
