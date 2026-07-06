import { authOptions } from '@/app/api/auth/auth-options';
import { getServerSession } from 'next-auth';

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  return session;
}

export async function getUserId(): Promise<string> {
  const session = await requireAuth();
  return (session.user as Record<string, unknown>).id as string;
}
