import { createFileRoute } from '@tanstack/react-router';
import { GenerationWorkspace } from '@/components/generation/generation-workspace';

export const Route = createFileRoute('/generate/resume')({
  component: ResumeGeneratorPage,
});

function ResumeGeneratorPage() {
  return <GenerationWorkspace type="resume" />;
}
