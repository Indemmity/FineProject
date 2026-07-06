'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Job } from './JobCard';

interface SavedJobsPanelProps {
  selectedJobs: Job[];
  onRemove: (id: string) => void;
}

export function SavedJobsPanel({ selectedJobs, onRemove }: SavedJobsPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ClipboardList className="h-4 w-4" />
          Selected Jobs ({selectedJobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {selectedJobs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Select jobs to tailor your resume and start outreach.
          </p>
        ) : (
          <div className="space-y-2">
            {selectedJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between rounded-md border p-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{job.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onRemove(job.id)}>
                  Remove
                </Button>
              </div>
            ))}
            <Link href="/dashboard/resume">
              <Button className="mt-2 w-full gap-1">
                Tailor Resume
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
