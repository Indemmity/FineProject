'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterPanelProps {
  location: string;
  onLocationChange: (v: string) => void;
  selectedRemote: string | null;
  onRemoteChange: (v: string | null) => void;
  selectedExperience: string | null;
  onExperienceChange: (v: string | null) => void;
}

const REMOTE_OPTIONS: FilterOption[] = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
];

const EXPERIENCE_OPTIONS: FilterOption[] = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Manager' },
];

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge variant="secondary" className="gap-1 pr-0.5">
      {label}
      <button onClick={onRemove} className="ml-1 rounded-full p-0.5 hover:bg-muted" aria-label={`Remove ${label}`}>
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export function FilterPanel({
  location,
  onLocationChange,
  selectedRemote,
  onRemoteChange,
  selectedExperience,
  onExperienceChange,
}: FilterPanelProps) {
  const hasFilters = location || selectedRemote || selectedExperience;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          placeholder="Location..."
          className="w-40"
        />
        {REMOTE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={selectedRemote === opt.value ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onRemoteChange(selectedRemote === opt.value ? null : opt.value)}
          >
            {opt.label}
          </Button>
        ))}
        {EXPERIENCE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={selectedExperience === opt.value ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onExperienceChange(selectedExperience === opt.value ? null : opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {location && <FilterBadge label={location} onRemove={() => onLocationChange('')} />}
          {selectedRemote && (
            <FilterBadge
              label={REMOTE_OPTIONS.find((o) => o.value === selectedRemote)!.label}
              onRemove={() => onRemoteChange(null)}
            />
          )}
          {selectedExperience && (
            <FilterBadge
              label={EXPERIENCE_OPTIONS.find((o) => o.value === selectedExperience)!.label}
              onRemove={() => onExperienceChange(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
