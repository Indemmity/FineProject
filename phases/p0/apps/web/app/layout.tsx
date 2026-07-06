import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SessionProvider from '@/components/ui/session-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Job Application Platform',
  description: 'AI-powered job search, resume tailoring, and outreach automation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-background text-foreground`}>
        <SessionProvider refetchInterval={5 * 60}>{children}</SessionProvider>
      </body>
    </html>
  );
}