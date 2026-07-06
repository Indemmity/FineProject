'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'card' | 'circle' | 'avatar' | 'list';
}

function Skeleton({ className, variant = 'text', ...props }: SkeletonProps) {
  const variants: Record<string, string> = {
    text: 'h-4 w-full rounded',
    card: 'h-48 w-full rounded-lg',
    circle: 'h-10 w-10 rounded-full',
    avatar: 'h-12 w-12 rounded-full',
    list: 'h-16 w-full rounded-lg',
  };

  return (
    <div
      className={cn('animate-pulse bg-muted', variants[variant]!, className)}
      aria-busy="true"
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex gap-4">
        <Skeleton variant="card" className="flex-1" />
        <Skeleton variant="card" className="flex-1" />
        <Skeleton variant="card" className="flex-1" />
      </div>
      <Skeleton variant="list" />
      <Skeleton variant="list" />
      <Skeleton variant="list" />
      <Skeleton variant="list" />
    </div>
  );
}
