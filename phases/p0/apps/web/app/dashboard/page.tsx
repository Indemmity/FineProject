"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/jobs/SearchBar';
import { FilterPanel } from '@/components/jobs/FilterPanel';
import { JobCard, type Job } from '@/components/jobs/JobCard';
import { SavedJobsPanel } from '@/components/jobs/SavedJobsPanel';
import { loadSelectedJobs, saveSelectedJobs } from '@/lib/selected-jobs';
import {
  listJobs,
  matchesJobQuery,
  normalizeExperienceLevel,
  normalizeWorkMode,
  searchJobs,
} from "@/lib/jobs";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [hasLoadedSelection, setHasLoadedSelection] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    setSelectedJobs(loadSelectedJobs());
    setHasLoadedSelection(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedSelection) {
      return;
    }
    saveSelectedJobs(selectedJobs);
  }, [selectedJobs, hasLoadedSelection]);

  const loadLatestJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobError(null);

    try {
      const nextJobs = await listJobs({ limit: 100 });
      setJobs(nextJobs);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Failed to load jobs");
    } finally {
      setIsLoadingJobs(false);
    }
  }, []);

  useEffect(() => {
    void loadLatestJobs();
  }, [loadLatestJobs]);

  const filteredJobs = useMemo(() => {
    const locationQuery = location.trim().toLowerCase();

    return jobs.filter((job) => {
      if (!matchesJobQuery(job, deferredSearchQuery)) {
        return false;
      }
      if (locationQuery && !job.location.toLowerCase().includes(locationQuery)) return false;
      if (selectedRemote && normalizeWorkMode(job.remote) !== selectedRemote) return false;
      if (selectedExperience && normalizeExperienceLevel(job.experience) !== selectedExperience) return false;
      return true;
    });
  }, [deferredSearchQuery, jobs, location, selectedExperience, selectedRemote]);

  const toggleJob = (job: Job) => {
    setSelectedJobs((prev) => {
      const exists = prev.find((j) => j.id === job.id);
      if (exists) return prev.filter((j) => j.id !== job.id);
      return [...prev, job];
    });
  };

  const handleSearch = useCallback(async () => {
    setIsSearching(true);
    setJobError(null);

    try {
      const trimmedQuery = searchQuery.trim();
      const trimmedLocation = location.trim();

      if (!trimmedQuery && !trimmedLocation) {
        await loadLatestJobs();
        return;
      }

      const nextJobs = await searchJobs({
        query: trimmedQuery || trimmedLocation,
        location: trimmedLocation || undefined,
        remoteOnly: selectedRemote === "remote",
        experienceLevel: selectedExperience ?? undefined,
      });
      setJobs(nextJobs);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Failed to search jobs");
    } finally {
      setIsSearching(false);
    }
  }, [loadLatestJobs, location, searchQuery, selectedExperience, selectedRemote]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Discover jobs, tailor your resume, and reach out.</p>
      </div>

      {jobError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {jobError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jobs Discovered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredJobs.length}</p>
            <p className="text-xs text-muted-foreground">
              {isLoadingJobs
                ? "Loading live jobs"
                : searchQuery || location || selectedRemote || selectedExperience
                ? 'Filtered results'
                : 'Live jobs loaded'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{selectedJobs.length}</p>
            <p className="text-xs text-muted-foreground">
              {selectedJobs.length > 0 ? 'Ready for tailoring' : 'Select jobs to get started'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outreach Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="text-xs text-muted-foreground">No emails sent yet</p>
          </CardContent>
        </Card>
      </div>

      <SearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={() => void handleSearch()}
        disabled={isLoadingJobs || isSearching}
      />

      <FilterPanel
        location={location}
        onLocationChange={setLocation}
        selectedRemote={selectedRemote}
        onRemoteChange={setSelectedRemote}
        selectedExperience={selectedExperience}
        onExperienceChange={setSelectedExperience}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {isLoadingJobs && jobs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading live jobs from the harvester...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {jobs.length === 0
                  ? 'No live jobs are available yet. Try a broader search.'
                  : 'No jobs match your filters.'}
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onSelect={toggleJob}
                selected={selectedJobs.some((j) => j.id === job.id)}
              />
            ))
          )}
        </div>
        <div className="space-y-4">
          <SavedJobsPanel
            selectedJobs={selectedJobs}
            onRemove={(id) => setSelectedJobs((prev) => prev.filter((j) => j.id !== id))}
          />
        </div>
      </div>
    </div>
  );
}
