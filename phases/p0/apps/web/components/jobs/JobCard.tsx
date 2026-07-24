'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Calendar, ExternalLink, Mail, Edit } from 'lucide-react';

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
  skills?: string[];
  contactEmail?: string | null;
}

interface JobCardProps {
  job: Job;
  onSelect?: (job: Job) => void;
  onEditDescription?: (job: Job) => void;
  selected?: boolean;
}

export function JobCard({ job, onSelect, onEditDescription, selected }: JobCardProps) {
  const postedDate = new Date(job.postedAt);
  const daysAgo = Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className={selected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
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
              {job.contactEmail && (
                <span className="flex items-center gap-1 text-primary">
                  <Mail className="h-3.5 w-3.5" />
                  {job.contactEmail}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {onEditDescription && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditDescription(job)}
                title="Edit job description"
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
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
        {job.skills && job.skills.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {job.skills.slice(0, 5).map((skill, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {job.skills.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{job.skills.length - 5} more
              </Badge>
            )}
          </div>
        )}
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
