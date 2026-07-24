"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SearchBar } from '@/components/jobs/SearchBar';
import { FilterPanel } from '@/components/jobs/FilterPanel';
import { JobCard, type Job } from '@/components/jobs/JobCard';
import { SavedJobsPanel } from '@/components/jobs/SavedJobsPanel';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { loadSelectedJobs, saveSelectedJobs } from '@/lib/selected-jobs';
import {
  listJobs,
  matchesJobQuery,
  normalizeExperienceLevel,
  normalizeWorkMode,
  searchJobs,
} from "@/lib/jobs";
import { generateOutreach } from "@/lib/outreach";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";

interface SourceCount {
  source: string;
  count: number;
  label: string;
}

function computeSourceStats(jobs: Job[]): SourceCount[] {
  const counts = new Map<string, number>();
  for (const job of jobs) {
    counts.set(job.source, (counts.get(job.source) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([source, count]) => ({ source, count, label: source }))
    .sort((a, b) => b.count - a.count);
}

const SOURCE_COLORS: Record<string, string> = {
  RemoteOK: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  Naukri: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  Wellfound: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  Indeed: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  TimesJobs: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  Foundit: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [selectedRemote, setSelectedRemote] = useState<string | null>(null);
  const [selectedExperience, setSelectedExperience] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [datePosted, setDatePosted] = useState<number | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Job[]>([]);
  const [hasLoadedSelection, setHasLoadedSelection] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editedDescription, setEditedDescription] = useState('');
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
      if (selectedSource && job.source.toLowerCase() !== selectedSource.toLowerCase()) return false;
      if (datePosted) {
        const cutoff = Date.now() - datePosted * 24 * 60 * 60 * 1000;
        const postedAt = new Date(job.postedAt).getTime();
        if (isNaN(postedAt) || postedAt < cutoff) return false;
      }
      return true;
    });
  }, [deferredSearchQuery, jobs, location, selectedExperience, selectedRemote, selectedSource, datePosted]);

  const sourceStats = useMemo(() => computeSourceStats(jobs), [jobs]);

  const toggleJob = (job: Job) => {
    setSelectedJobs((prev) => {
      const exists = prev.find((j) => j.id === job.id);
      if (exists) return prev.filter((j) => j.id !== job.id);
      return [...prev, job];
    });
  };

  const handleSearch = useCallback(async () => {
    setIsRefreshing(true);
    setJobError(null);

    try {
      const nextJobs = await listJobs({
        limit: 100,
        source: selectedSource ?? undefined,
      });
      setJobs(nextJobs);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Failed to search");
    } finally {
      setIsRefreshing(false);
    }
  }, [selectedSource]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setJobError(null);

    try {
      const trimmedQuery = searchQuery.trim();
      const trimmedLocation = location.trim();

      if (!trimmedQuery && !trimmedLocation && !selectedSource && !datePosted) {
        await loadLatestJobs();
        return;
      }

      const nextJobs = await searchJobs({
        query: trimmedQuery,
        location: trimmedLocation || undefined,
        remoteOnly: selectedRemote === "remote",
        experienceLevel: selectedExperience ?? undefined,
        datePosted: datePosted ?? undefined,
        source: selectedSource,
      });
      setJobs(nextJobs);
    } catch (error) {
      setJobError(error instanceof Error ? error.message : "Failed to refresh jobs");
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLatestJobs, location, searchQuery, selectedExperience, selectedRemote, selectedSource, datePosted]);

  const handleEditDescription = (job: Job) => {
    setEditingJob(job);
    setEditedDescription(job.description);
  };

  const handleSaveDescription = () => {
    if (editingJob) {
      // Update the job description in the jobs list
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === editingJob.id 
            ? { ...job, description: editedDescription }
            : job
        )
      );
      setEditingJob(null);
      setEditedDescription('');
    }
  };

  const handleCancelEdit = () => {
    setEditingJob(null);
    setEditedDescription('');
  };

  const handleGenerateOutreach = async (job: Job) => {
    if (!job.contactEmail) return;
    
    try {
      // Create a temporary application for outreach generation
      const tempApplicationId = `temp-${job.id}`;
      
      await generateOutreach({
        applicationId: tempApplicationId,
        recipientEmail: job.contactEmail,
        recipientName: job.company, // Use company name as recipient name
        job: {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
        },
      });
      
      // Navigate to outreach console
      router.push('/dashboard/outreach');
    } catch (error) {
      console.error('Failed to generate outreach:', error);
      setJobError(error instanceof Error ? error.message : 'Failed to generate outreach email');
    }
  };

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Jobs Discovered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredJobs.length}</p>
            <p className="text-xs text-muted-foreground">
              {isLoadingJobs
                ? "Loading live jobs"
                : searchQuery || location || selectedRemote || selectedExperience || selectedSource || datePosted
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {sourceStats.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data</p>
            ) : (
              sourceStats.map((s) => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${SOURCE_COLORS[s.source] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}>
                    {s.source}
                  </span>
                  <span className="font-semibold tabular-nums">{s.count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <Button
          onClick={() => void handleRefresh()}
          disabled={isLoadingJobs || isRefreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Scraping...' : 'Scrape'}
        </Button>
      </div>

      <FilterPanel
        location={location}
        onLocationChange={setLocation}
        selectedRemote={selectedRemote}
        onRemoteChange={setSelectedRemote}
        selectedExperience={selectedExperience}
        onExperienceChange={setSelectedExperience}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        datePosted={datePosted}
        onDatePostedChange={setDatePosted}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          {isLoadingJobs && jobs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Loading live jobs...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">
                {jobs.length === 0
                  ? 'No live jobs are available yet. Click "Scrape" to fetch jobs from all platforms.'
                  : 'No jobs match your filters.'}
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onSelect={toggleJob}
                onEditDescription={handleEditDescription}
                selected={selectedJobs.some((j) => j.id === job.id)}
              />
            ))
          )}
        </div>
        <div className="space-y-4">
          <SavedJobsPanel
            selectedJobs={selectedJobs}
            onRemove={(id) => setSelectedJobs((prev) => prev.filter((j) => j.id !== id))}
            onGenerateOutreach={handleGenerateOutreach}
          />
        </div>
      </div>

      <Dialog open={editingJob !== null} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Job Description</DialogTitle>
            <DialogDescription>
              {editingJob?.title} at {editingJob?.company}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              rows={12}
              className="w-full"
              placeholder="Edit the job description..."
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveDescription}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
