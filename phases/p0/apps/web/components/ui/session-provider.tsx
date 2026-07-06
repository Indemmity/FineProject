'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

export default function SessionProvider({
  children,
  refetchInterval,
}: {
  children: ReactNode;
  refetchInterval?: number;
}) {
  return (
    <NextAuthSessionProvider refetchInterval={refetchInterval}>
      {children}
    </NextAuthSessionProvider>
  );
}