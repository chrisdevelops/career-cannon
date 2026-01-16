import { createFileRoute } from '@tanstack/react-router';
import { PageContent, PageHeaderBar, PageShell } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { AppLayout } from '@/components/app-layout';
import { PromptEditor } from '@/components/prompts/prompt-editor';

export const Route = createFileRoute('/prompts/resume-generation')({
  component: ResumeGenerationPromptPage,
});

function ResumeGenerationPromptPage() {
  return (
    <AppLayout>
      <PageShell>
        <PageHeaderBar>
          <PageTitleBar
            title="Prompts"
            subtitle="Resume Generation Configuration"
          />
        </PageHeaderBar>
        <PageContent>
          <div className="max-w-5xl mx-auto">
            <PromptEditor promptKey="resume-generator" />
          </div>
        </PageContent>
      </PageShell>
    </AppLayout>
  );
}
