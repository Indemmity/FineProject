'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4 lg:px-6">
      <span className="text-lg font-semibold md:hidden">Job Platform</span>

      <div className="hidden flex-1 md:block" />

      <div className="flex items-center gap-3">
        <span className="hidden text-sm text-muted-foreground md:inline-block">
          {session?.user?.email ?? 'Not signed in'}
        </span>
        <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
