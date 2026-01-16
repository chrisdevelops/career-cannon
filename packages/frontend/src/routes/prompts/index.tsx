import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/prompts/')({
  beforeLoad: () => {
    throw redirect({
      to: '/prompts/resume-parser',
    });
  },
});
