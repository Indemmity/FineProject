'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/dashboard/resume', label: 'Resume Studio', icon: '📝' },
  { href: '/dashboard/outreach', label: 'Outreach', icon: '📧' },
  { href: '/dashboard/tracker', label: 'Tracker', icon: '📋' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-background">
      <div className="p-4 border-b">
        <Link href="/dashboard" className="text-lg font-bold">
          Job Platform
        </Link>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3"
              >
                <span>{item.icon}</span>
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
