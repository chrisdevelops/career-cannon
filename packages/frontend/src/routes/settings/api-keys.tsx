import { createFileRoute } from '@tanstack/react-router';
import { PageContent, PageHeaderBar, PageShell } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { AppLayout } from '@/components/app-layout';
import { ApiKeysSettings } from '@/components/settings/api-keys-settings';

export const Route = createFileRoute('/settings/api-keys')({
  component: ApiKeysSettingsPage,
});

function ApiKeysSettingsPage() {
  return (
    <AppLayout>
      <PageShell>
        <PageHeaderBar>
          <PageTitleBar
            title="Settings"
            subtitle="API Key Configuration"
          />
        </PageHeaderBar>
        <PageContent>
          <div className="max-w-2xl mx-auto">
            <ApiKeysSettings />
          </div>
        </PageContent>
      </PageShell>
    </AppLayout>
  );
}
