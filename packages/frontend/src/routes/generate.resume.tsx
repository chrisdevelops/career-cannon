import { createFileRoute } from '@tanstack/react-router';
import { GenerationWorkspace } from '@/components/generation/generation-workspace';

export const Route = createFileRoute('/generate/resume')({
  component: ResumeGeneratorPage,
});

function ResumeGeneratorPage() {
  const search = Route.useSearch() as { generationId?: string; versionId?: string };
  return (
    <GenerationWorkspace
      type="resume"
      generationId={search.generationId}
      versionId={search.versionId}
    />
  );
}
