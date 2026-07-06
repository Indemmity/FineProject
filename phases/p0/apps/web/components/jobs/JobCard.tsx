'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Calendar, ExternalLink } from 'lucide-react';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: string | null;
  experience: string | null;
  postedAt: string;
  url: string;
  source: string;
  description: string;
  salary: string | null;
}

interface JobCardProps {
  job: Job;
  onSelect?: (job: Job) => void;
  selected?: boolean;
}

export function JobCard({ job, onSelect, selected }: JobCardProps) {
  const postedDate = new Date(job.postedAt);
  const daysAgo = Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={selected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{job.title}</CardTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}
              </span>
            </div>
          </div>
          {onSelect && (
            <Button
              variant={selected ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => onSelect(job)}
            >
              {selected ? 'Selected' : 'Select'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {job.remote && <Badge variant="secondary">{job.remote}</Badge>}
          {job.experience && <Badge variant="outline">{job.experience}</Badge>}
          {job.salary && <Badge variant="outline">{job.salary}</Badge>}
          <Badge variant="outline" className="text-xs">
            {job.source}
          </Badge>
        </div>
        <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{job.description}</p>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View on {job.source}
          <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  );
}
