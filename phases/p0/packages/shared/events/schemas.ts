/**
 * Event schemas — TypeScript interfaces for all platform events.
 *
 * Events are published via the event bus (Redis Pub/Sub) whenever
 * a service completes a key operation. Consumers use these to update
 * dashboards, trigger follow-ups, and drive the pipeline.
 */

/** Base event every event extends */
export interface BaseEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  userId: string;
  pipelineId?: string;
}

// ─── Harvester Events ────────────────────────────────────────────────────────

export interface JobSearchCompletedEvent extends BaseEvent {
  eventType: "job.search.completed";
  data: {
    searchId: string;
    keywords: string[];
    resultCount: number;
    sources: string[];
  };
}

// ─── Resume Tailor Events ────────────────────────────────────────────────────

export interface ResumeUploadedEvent extends BaseEvent {
  eventType: "resume.uploaded";
  data: {
    resumeId: string;
    filename: string;
    format: string;
    wordCount: number;
  };
}

export interface ResumeAnalyzedEvent extends BaseEvent {
  eventType: "resume.analyzed";
  data: {
    resumeId: string;
    jobId?: string;
    score: number;
    gapCount: number;
  };
}

export interface ResumeTailoredEvent extends BaseEvent {
  eventType: "resume.tailored";
  data: {
    resumeId: string;
    jobId?: string;
    sectionCount: number;
    guardrailsPassed: boolean;
  };
}

// ─── Outreach Events ─────────────────────────────────────────────────────────

export interface OutreachGeneratedEvent extends BaseEvent {
  eventType: "outreach.generated";
  data: {
    outreachId: string;
    applicationId: string;
    recipientEmail: string;
    templateType: string;
  };
}

export interface OutreachSentEvent extends BaseEvent {
  eventType: "outreach.sent";
  data: {
    outreachId: string;
    applicationId: string;
    messageId: string;
    success: boolean;
  };
}

export interface OutreachTrackedEvent extends BaseEvent {
  eventType: "outreach.tracked";
  data: {
    outreachId: string;
    event: "delivered" | "bounced" | "opened" | "replied";
  };
}

// ─── Pipeline Events ─────────────────────────────────────────────────────────

export interface PipelineStartedEvent extends BaseEvent {
  eventType: "pipeline.started";
  data: {};
}

export interface PipelineStepCompletedEvent extends BaseEvent {
  eventType: "pipeline.step.completed";
  data: {
    step: string;
    nextState: string;
  };
}

export interface PipelineFailedEvent extends BaseEvent {
  eventType: "pipeline.failed";
  data: {
    step: string;
    error: string;
  };
}

export interface PipelineCompletedEvent extends BaseEvent {
  eventType: "pipeline.completed";
  data: {};
}

// ─── Union type for all events ───────────────────────────────────────────────

export type PlatformEvent =
  | JobSearchCompletedEvent
  | ResumeUploadedEvent
  | ResumeAnalyzedEvent
  | ResumeTailoredEvent
  | OutreachGeneratedEvent
  | OutreachSentEvent
  | OutreachTrackedEvent
  | PipelineStartedEvent
  | PipelineStepCompletedEvent
  | PipelineFailedEvent
  | PipelineCompletedEvent;

export type EventHandler = (event: PlatformEvent) => void | Promise<void>;