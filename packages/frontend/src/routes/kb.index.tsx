import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/kb/')({
  component: () => <Navigate to="/kb/profile" />,
});
