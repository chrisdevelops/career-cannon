import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AppLayout } from '@/components/app-layout';

export const Route = createFileRoute('/kb')({
  component: KBLayout,
});

function KBLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
