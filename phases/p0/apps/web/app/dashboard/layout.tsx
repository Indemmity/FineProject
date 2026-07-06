import { AppShell } from '@/components/layout/AppShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell sidebar={<Sidebar />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}
