import { createFileRoute } from '@tanstack/react-router';
import { PageContent, PageHeaderBar, PageShell } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { AppLayout } from '@/components/app-layout';
import { PromptEditor } from '@/components/prompts/prompt-editor';

export const Route = createFileRoute('/prompts/suggestions')({
  component: SuggestionsPromptPage,
});

function SuggestionsPromptPage() {
  return (
    <AppLayout>
      <PageShell>
        <PageHeaderBar>
          <PageTitleBar
            title="Prompts"
            subtitle="Suggestions Configuration"
          />
        </PageHeaderBar>
        <PageContent>
          <div className="max-w-5xl mx-auto">
            <PromptEditor promptKey="suggestions" />
          </div>
        </PageContent>
      </PageShell>
    </AppLayout>
  );
}
