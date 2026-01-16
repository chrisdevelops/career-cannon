import { createFileRoute } from '@tanstack/react-router';
import { GenerationWorkspace } from '@/components/generation/generation-workspace';

export const Route = createFileRoute('/generate/cover-letter')({
  component: CoverLetterGeneratorPage,
});

function CoverLetterGeneratorPage() {
  const search = Route.useSearch() as { generationId?: string; versionId?: string };
  return (
    <GenerationWorkspace
      type="cover_letter"
      generationId={search.generationId}
      versionId={search.versionId}
    />
  );
}
