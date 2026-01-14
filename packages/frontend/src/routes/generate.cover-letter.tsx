import { createFileRoute } from '@tanstack/react-router';
import { GenerationWorkspace } from '@/components/generation/generation-workspace';

export const Route = createFileRoute('/generate/cover-letter')({
  component: CoverLetterGeneratorPage,
});

function CoverLetterGeneratorPage() {
  return <GenerationWorkspace type="cover_letter" />;
}
