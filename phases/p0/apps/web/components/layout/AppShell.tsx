'use client';

import { cn } from '@/lib/utils';
import { Navbar } from './Navbar';

interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ sidebar, children, className }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden shrink-0 md:block">{sidebar}</div>
        <main className={cn('flex-1 overflow-y-auto bg-muted/10', className)}>{children}</main>
      </div>
    </div>
  );
}
