'use client';

import { Suspense, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [smtpStatus, setSmtpStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch('/api/debug/smtp')
      .then(r => r.json())
      .then(d => {
        const connected = d.smtp?.user_configured && d.smtp?.pass_configured;
        setSmtpStatus({
          connected: !!connected,
          message: connected
            ? `🟢 Mail ready: ${d.smtp?.user_value}`
            : '🔴 Magic link unavailable — SMTP not configured. Use demo login instead.',
        });
      })
      .catch(() => setSmtpStatus({ connected: false, message: '🔴 SMTP status unknown' }));
  }, []);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn('magic-link', { email, redirect: false });

      if (result?.error) {
        setError('Failed to sign in. Please check your email.');
      } else {
        setSent(true);
        router.push(callbackUrl);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDevLogin() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn('dev-login', {
        email: 'demo@jobplatform.dev',
        redirect: false,
      });

      if (result?.error) {
        setError(`Demo login failed: ${result.error}`);
      } else {
        router.push(callbackUrl);
      }
    } catch {
      setError('Demo login failed. Is NODE_ENV=development?');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account to continue</p>
        {smtpStatus && (
          <div className={`text-xs px-2 py-1 rounded inline-block ${
            smtpStatus.connected 
              ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
              : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }`}>
            {smtpStatus.message}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      {sent ? (
        <div className="rounded-md bg-primary/10 p-4 text-center text-sm">
          Check your email for a sign-in link.
        </div>
      ) : (
        <>
          {/* ── Email / Magic Link ── */}
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Sending link...' : 'Send magic link'}
            </button>
          </form>

          {/* ── Demo User ── */}
          {(process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ALLOW_DEMO_LOGIN === 'true') && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-dashed border-muted-foreground/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Development only</span>
                </div>
              </div>

              <button
                onClick={handleDevLogin}
                disabled={isLoading}
                className="w-full rounded-md border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 px-4 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors"
              >
                <span className="flex items-center justify-center gap-2">
                  <span className="text-lg">🤖</span>
                  <span>{isLoading ? 'Signing in...' : 'Continue as Demo User'}</span>
                </span>
              </button>
              <p className="text-center text-[11px] text-muted-foreground">
                demo@jobplatform.dev &middot; No OAuth required &middot; Local data only
              </p>
            </>
          )}

          {/* ── OAuth ── */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => signIn('google', { callbackUrl }).catch(() => {})}
              className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Google
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <Suspense
        fallback={
          <div className="w-full max-w-sm space-y-6 text-center">
            <div className="animate-pulse h-8 w-48 bg-muted rounded mx-auto" />
            <div className="animate-pulse h-10 w-full bg-muted rounded" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}