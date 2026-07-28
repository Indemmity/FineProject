import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { getDb, users } from '@jobplatform/shared/db';
import { eq } from 'drizzle-orm';

const DEMO_EMAIL = 'demo@jobplatform.dev';

/**
 * Upsert a user record in the database on sign-in.
 * If the database isn't available, this is a no-op (auth still works).
 * Returns the user's stable UUID, falling back to email-based ID if DB is unavailable.
 */
async function upsertUser(email: string, name: string): Promise<string> {
  const db = getDb();
  if (!db) {
    // No database — use email as the user ID (existing in-memory behaviour)
    return email;
  }

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return existing[0]!.id;
    }

    const inserted = await db
      .insert(users)
      .values({ email, name })
      .returning({ id: users.id });

    return inserted[0]!.id;
  } catch (e) {
    console.warn('[auth] Failed to upsert user in database:', e);
    return email; // fallback to email-as-id
  }
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === 'development',
  providers: [
    // ✦ Development-only demo user — bypasses OAuth for local testing.
    //   In production this provider returns null, so no JWT can be minted.
    CredentialsProvider({
      id: 'dev-login',
      name: 'Demo User',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        // Allow dev-login in dev OR when explicitly enabled on Vercel previews
        if (process.env.VERCEL_ENV === 'preview' || process.env.ALLOW_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development') {
          const email = (credentials?.email ?? '').toLowerCase().trim();
          if (!email) return null;
          return {
            id: email,
            email,
            name: email === DEMO_EMAIL ? 'Demo User' : email.split('@')[0] ?? 'Dev User',
          };
        }
        return null;
      },
    }),
    // ✦ Magic-link credentials provider (default)
    CredentialsProvider({
      id: 'magic-link',
      name: 'Magic Link',
      credentials: {
        email: { label: 'Email', type: 'email' },
      },
      async authorize(credentials) {
        if (!credentials?.email || typeof credentials.email !== 'string') {
          return null;
        }
        return {
          id: credentials.email.toLowerCase(),
          email: credentials.email.toLowerCase(),
          name: credentials.email.split('@')[0] ?? 'User',
        };
      },
    }),
    // ✦ OAuth providers — only activate when env vars are set
    ...(process.env.GOOGLE_CLIENT_ID
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
          }),
        ]
      : []),
    ...(process.env.GITHUB_CLIENT_ID
      ? [
          GitHubProvider({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session?.user && token?.sub) {
        (session.user as Record<string, unknown>).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // Persist or look up the user in the database to get a stable UUID
        const email = (user.email ?? token.email ?? '').toLowerCase().trim();
        const name = user.name ?? email.split('@')[0] ?? 'User';
        const userId = await upsertUser(email, name);
        token.sub = userId;
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
};