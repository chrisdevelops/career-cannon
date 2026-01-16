import { createFileRoute } from '@tanstack/react-router';
import { PageContent, PageHeaderBar, PageShell } from '@/components/layout/page-shell';
import { PageTitleBar } from '@/components/layout/page-title-bar';
import { AppLayout } from '@/components/app-layout';
import { PromptEditor } from '@/components/prompts/prompt-editor';

export const Route = createFileRoute('/prompts/resume-parser')({
  component: ResumeParserPromptPage,
});

function ResumeParserPromptPage() {
  return (
    <AppLayout>
      <PageShell>
        <PageHeaderBar>
          <PageTitleBar
            title="Prompts"
            subtitle="Resume Parser Configuration"
          />
        </PageHeaderBar>
        <PageContent>
          <div className="max-w-5xl mx-auto">
            <PromptEditor promptKey="resume-parser" />
          </div>
        </PageContent>
      </PageShell>
    </AppLayout>
  );
}
