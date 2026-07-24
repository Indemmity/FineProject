'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const LOCATION_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'Bangalore', label: 'Bangalore' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Kolkata', label: 'Kolkata' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Ahmedabad', label: 'Ahmedabad' },
  { value: 'Jaipur', label: 'Jaipur' },
  { value: 'Lucknow', label: 'Lucknow' },
  { value: 'Noida', label: 'Noida' },
  { value: 'Gurgaon', label: 'Gurgaon' },
  { value: 'Chandigarh', label: 'Chandigarh' },
  { value: 'Indore', label: 'Indore' },
  { value: 'Bhopal', label: 'Bhopal' },
  { value: 'Kochi', label: 'Kochi' },
  { value: 'Coimbatore', label: 'Coimbatore' },
  { value: 'Nagpur', label: 'Nagpur' },
  { value: 'Visakhapatnam', label: 'Visakhapatnam' },
  { value: 'Surat', label: 'Surat' },
  { value: 'Patna', label: 'Patna' },
  { value: 'India', label: 'India (All)' },
  { value: 'Remote', label: 'Remote' },
];

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
  selectedSource: string | null;
  onSourceChange: (v: string | null) => void;
  datePosted: number | null;
  onDatePostedChange: (v: number | null) => void;
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

const SOURCE_OPTIONS: FilterOption[] = [
  { value: 'remoteok', label: 'RemoteOK' },
  { value: 'naukri', label: 'Naukri' },
  { value: 'wellfound', label: 'Wellfound' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'timesjobs', label: 'TimesJobs' },
  { value: 'monster', label: 'Monster' },
];

const DATE_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'Any' },
  { value: 1, label: '24h' },
  { value: 7, label: '7d' },
  { value: 30, label: '30d' },
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
  selectedSource,
  onSourceChange,
  datePosted,
  onDatePostedChange,
}: FilterPanelProps) {
  const hasFilters = location || selectedRemote || selectedExperience || selectedSource || datePosted;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={location}
          onChange={(e) => onLocationChange(e.target.value)}
          className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {LOCATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="h-5 w-px bg-border mx-1" />
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
        <div className="h-5 w-px bg-border mx-1" />
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
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium mr-1">Source:</span>
        {SOURCE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={selectedSource === opt.value ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onSourceChange(selectedSource === opt.value ? null : opt.value)}
          >
            {opt.label}
          </Button>
        ))}
        <div className="h-5 w-px bg-border mx-1" />
        <span className="text-xs text-muted-foreground font-medium mr-1">Posted:</span>
        {DATE_OPTIONS.map((opt) => (
          <Button
            key={opt.label}
            variant={datePosted === opt.value ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => onDatePostedChange(opt.value === datePosted ? null : opt.value)}
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
          {selectedSource && (
            <FilterBadge
              label={SOURCE_OPTIONS.find((o) => o.value === selectedSource)!.label}
              onRemove={() => onSourceChange(null)}
            />
          )}
          {datePosted && (
            <FilterBadge
              label={DATE_OPTIONS.find((o) => o.value === datePosted)!.label}
              onRemove={() => onDatePostedChange(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
