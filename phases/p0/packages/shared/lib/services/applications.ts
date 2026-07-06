/**
 * Application CRUD - manages applications with status transitions and timeline events.
 *
 * PostgreSQL is the primary store. A global in-memory cache keeps the app usable
 * when DATABASE_URL is unavailable or a database query fails.
 */

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getDb, applications, timelineEvents } from "../../db";

export type ApplicationStatus =
  | "discovered"
  | "analyzed"
  | "tailored"
  | "outreach_sent"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "closed";

export interface TimelineEvent {
  timestamp: string;
  event: string;
  detail: string;
  source: "system" | "user";
}

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  resumeId?: string;
  status: ApplicationStatus;
  matchScore?: number;
  gapAnalysis?: unknown[];
  tailoredResumeText?: string;
  coverLetterText?: string;
  appliedAt?: string;
  notes: string;
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  discovered: ["analyzed", "closed"],
  analyzed: ["tailored", "discovered", "closed"],
  tailored: ["outreach_sent", "analyzed", "closed"],
  outreach_sent: ["applied", "tailored", "closed"],
  applied: ["interview", "rejected", "closed"],
  interview: ["offer", "rejected", "closed"],
  offer: ["applied", "rejected", "closed"],
  rejected: ["closed", "applied", "interview"],
  closed: [],
};

const globalForStore = globalThis as unknown as {
  applicationMemStore?: Map<string, Application>;
};

const store =
  globalForStore.applicationMemStore ?? new Map<string, Application>();

if (process.env.NODE_ENV !== "production") {
  globalForStore.applicationMemStore = store;
}

type DbClient = NonNullable<ReturnType<typeof getDb>>;
type QueryClient = Pick<DbClient, "select" | "insert" | "update" | "delete">;
type ApplicationRow = typeof applications.$inferSelect;
type ApplicationInsert = typeof applications.$inferInsert;
type TimelineEventRow = typeof timelineEvents.$inferSelect;
type TimelineEventInsert = typeof timelineEvents.$inferInsert;

function now(): Date {
  return new Date();
}

function nowIso(): string {
  return now().toISOString();
}

function isKnownStatus(value: string): value is ApplicationStatus {
  return Object.prototype.hasOwnProperty.call(VALID_TRANSITIONS, value);
}

function normalizeStatus(value: string): ApplicationStatus {
  return isKnownStatus(value) ? value : "discovered";
}

function toIsoString(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return nowIso();
}

function toUnknownArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function buildTimelineEvent(
  timestamp: Date | string,
  event: string,
  detail: string,
  source: "system" | "user" = "system",
): TimelineEvent {
  return {
    timestamp: toIsoString(timestamp),
    event,
    detail,
    source,
  };
}

function rowToTimelineEvent(row: TimelineEventRow): TimelineEvent {
  return {
    timestamp: toIsoString(row.timestamp),
    event: row.event,
    detail: row.detail,
    source: row.source === "user" ? "user" : "system",
  };
}

function rowToApplication(
  row: ApplicationRow,
  timeline: TimelineEvent[] = [],
): Application {
  return {
    id: row.id,
    userId: row.userId,
    jobId: row.jobId,
    resumeId: row.resumeId ?? undefined,
    status: normalizeStatus(row.status),
    matchScore: row.matchScore ?? undefined,
    gapAnalysis: toUnknownArray(row.gapAnalysis),
    tailoredResumeText: row.tailoredResumeText ?? undefined,
    coverLetterText: row.coverLetterText ?? undefined,
    appliedAt: row.appliedAt ? toIsoString(row.appliedAt) : undefined,
    notes: row.notes,
    timeline,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function syncCache(app: Application): Application {
  store.set(app.id, app);
  return app;
}

function sortApplications(apps: Application[]): Application[] {
  return [...apps].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

function listApplicationsFromMemory(
  userId: string,
  status?: ApplicationStatus,
): Application[] {
  const apps = Array.from(store.values()).filter((app) => app.userId === userId);
  const filtered = status ? apps.filter((app) => app.status === status) : apps;
  return sortApplications(filtered);
}

function mergeApplications(
  memoryApps: Application[],
  dbApps: Application[],
): Application[] {
  const byId = new Map<string, Application>();

  for (const app of memoryApps) {
    byId.set(app.id, app);
  }

  for (const app of dbApps) {
    byId.set(app.id, app);
  }

  return sortApplications(Array.from(byId.values()));
}

function buildNewApplication(
  userId: string,
  jobId: string,
  resumeId?: string,
): Application {
  const timestamp = nowIso();
  const createdEvent = buildTimelineEvent(
    timestamp,
    "application.created",
    "Application created from job discovery",
  );

  return {
    id: randomUUID(),
    userId,
    jobId,
    resumeId,
    status: "discovered",
    notes: "",
    timeline: [createdEvent],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function applyApplicationUpdates(
  app: Application,
  updates: Partial<Application>,
): Application {
  if (updates.resumeId !== undefined) app.resumeId = updates.resumeId;
  if (updates.status !== undefined) app.status = updates.status;
  if (updates.matchScore !== undefined) app.matchScore = updates.matchScore;
  if (updates.gapAnalysis !== undefined) app.gapAnalysis = updates.gapAnalysis;
  if (updates.tailoredResumeText !== undefined) {
    app.tailoredResumeText = updates.tailoredResumeText;
  }
  if (updates.coverLetterText !== undefined) {
    app.coverLetterText = updates.coverLetterText;
  }
  if (updates.appliedAt !== undefined) app.appliedAt = updates.appliedAt;
  if (updates.notes !== undefined) app.notes = updates.notes;
  app.updatedAt = nowIso();
  return app;
}

function appendTransition(
  app: Application,
  newStatus: ApplicationStatus,
  detail: string,
): Application {
  const timestamp = nowIso();
  app.status = newStatus;
  app.timeline.push(
    buildTimelineEvent(timestamp, `status.${newStatus}`, detail, "user"),
  );
  app.updatedAt = timestamp;
  return app;
}

function addOptionalApplicationFields(
  values: Partial<ApplicationInsert>,
  app: Application,
): void {
  if (app.resumeId !== undefined) values.resumeId = app.resumeId;
  if (app.matchScore !== undefined) values.matchScore = app.matchScore;
  if (app.gapAnalysis !== undefined) values.gapAnalysis = app.gapAnalysis;
  if (app.tailoredResumeText !== undefined) {
    values.tailoredResumeText = app.tailoredResumeText;
  }
  if (app.coverLetterText !== undefined) {
    values.coverLetterText = app.coverLetterText;
  }
  if (app.appliedAt !== undefined) {
    values.appliedAt = new Date(app.appliedAt);
  }
}

function buildDbInsertValues(app: Application): ApplicationInsert {
  const values: Partial<ApplicationInsert> = {
    id: app.id,
    userId: app.userId,
    jobId: app.jobId,
    status: app.status,
    notes: app.notes,
    createdAt: new Date(app.createdAt),
    updatedAt: new Date(app.updatedAt),
  };

  addOptionalApplicationFields(values, app);
  return values as ApplicationInsert;
}

function buildDbUpdateValues(app: Application): Partial<ApplicationInsert> {
  const values: Partial<ApplicationInsert> = {
    status: app.status,
    notes: app.notes,
    updatedAt: new Date(app.updatedAt),
  };

  addOptionalApplicationFields(values, app);
  return values;
}

function buildTimelineInsertValues(
  applicationId: string,
  event: TimelineEvent,
): TimelineEventInsert {
  return {
    applicationId,
    event: event.event,
    detail: event.detail,
    source: event.source,
    timestamp: new Date(event.timestamp),
  };
}

async function loadApplicationFromDb(
  client: QueryClient,
  id: string,
): Promise<Application | undefined> {
  const rows = await client
    .select()
    .from(applications)
    .where(eq(applications.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  let timelineRows: TimelineEventRow[] = [];
  try {
    timelineRows = await client
      .select()
      .from(timelineEvents)
      .where(eq(timelineEvents.applicationId, id))
      .orderBy(asc(timelineEvents.timestamp));
  } catch (error) {
    warnDatabaseFallback("load application timeline", error);
  }

  return syncCache(rowToApplication(row, timelineRows.map(rowToTimelineEvent)));
}

async function loadApplicationsFromDb(
  client: QueryClient,
  userId: string,
  status?: ApplicationStatus,
): Promise<Application[]> {
  const conditions = [eq(applications.userId, userId)];
  if (status) {
    conditions.push(eq(applications.status, status));
  }

  const rows = await client
    .select()
    .from(applications)
    .where(conditions.length === 1 ? conditions[0]! : and(...conditions))
    .orderBy(desc(applications.createdAt));

  if (rows.length === 0) return [];

  let timelineRows: TimelineEventRow[] = [];
  try {
    timelineRows = await client
      .select()
      .from(timelineEvents)
      .where(
        inArray(
          timelineEvents.applicationId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(timelineEvents.timestamp));
  } catch (error) {
    warnDatabaseFallback("load application timelines", error);
  }

  const timelineByApplication = new Map<string, TimelineEvent[]>();
  for (const row of timelineRows) {
    const event = rowToTimelineEvent(row);
    const events = timelineByApplication.get(row.applicationId) ?? [];
    events.push(event);
    timelineByApplication.set(row.applicationId, events);
  }

  return rows.map((row) =>
    syncCache(rowToApplication(row, timelineByApplication.get(row.id) ?? [])),
  );
}

async function persistApplicationCreation(
  db: DbClient,
  app: Application,
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(applications).values(buildDbInsertValues(app));
    const event = app.timeline[0];
    if (event) {
      await tx.insert(timelineEvents).values(buildTimelineInsertValues(app.id, event));
    }
  });
}

async function persistApplicationUpdate(
  db: DbClient,
  app: Application,
): Promise<void> {
  await db
    .update(applications)
    .set(buildDbUpdateValues(app))
    .where(eq(applications.id, app.id));
}

async function persistApplicationTransition(
  db: DbClient,
  app: Application,
): Promise<void> {
  const event = app.timeline[app.timeline.length - 1];
  await db.transaction(async (tx) => {
    await tx
      .update(applications)
      .set(buildDbUpdateValues(app))
      .where(eq(applications.id, app.id));

    if (event) {
      await tx.insert(timelineEvents).values(buildTimelineInsertValues(app.id, event));
    }
  });
}

function warnDatabaseFallback(operation: string, error: unknown): void {
  console.warn(
    `[applications] Failed to ${operation} in database, using memory fallback:`,
    error,
  );
}

export async function createApplication(
  userId: string,
  jobId: string,
  resumeId?: string,
): Promise<Application> {
  const app = buildNewApplication(userId, jobId, resumeId);
  const db = getDb();

  if (db) {
    try {
      await persistApplicationCreation(db, app);
    } catch (error) {
      warnDatabaseFallback("create application", error);
    }
  }

  return syncCache(app);
}

export async function getApplication(id: string): Promise<Application | undefined> {
  const db = getDb();
  if (db) {
    try {
      const app = await loadApplicationFromDb(db, id);
      if (app) return app;
    } catch (error) {
      warnDatabaseFallback("read application", error);
    }
  }

  return store.get(id);
}

export async function updateApplication(
  id: string,
  updates: Partial<Application>,
): Promise<Application> {
  const current = await getApplication(id);
  if (!current) throw new Error(`Application ${id} not found`);

  applyApplicationUpdates(current, updates);

  const db = getDb();
  if (db) {
    try {
      await persistApplicationUpdate(db, current);
    } catch (error) {
      warnDatabaseFallback("update application", error);
    }
  }

  return syncCache(current);
}

export async function transitionStatus(
  id: string,
  newStatus: ApplicationStatus,
  note?: string,
): Promise<Application> {
  const current = await getApplication(id);
  if (!current) throw new Error(`Application ${id} not found`);

  const allowed = VALID_TRANSITIONS[current.status];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${current.status} -> ${newStatus}. ` +
        `Allowed: ${allowed.join(", ")}`,
    );
  }

  const detail = note ?? `Status changed from ${current.status} to ${newStatus}`;
  appendTransition(current, newStatus, detail);

  const db = getDb();
  if (db) {
    try {
      await persistApplicationTransition(db, current);
    } catch (error) {
      warnDatabaseFallback("transition status", error);
    }
  }

  return syncCache(current);
}

export async function deleteApplication(id: string): Promise<boolean> {
  let deleted = store.delete(id);
  const db = getDb();

  if (db) {
    try {
      const rows = await db
        .delete(applications)
        .where(eq(applications.id, id))
        .returning({ id: applications.id });
      deleted = rows.length > 0 || deleted;
    } catch (error) {
      warnDatabaseFallback("delete application", error);
    }
  }

  return deleted;
}

export async function listApplications(
  userId: string,
  status?: ApplicationStatus,
): Promise<Application[]> {
  const memoryApps = listApplicationsFromMemory(userId, status);
  const db = getDb();
  if (!db) return memoryApps;

  try {
    const dbApps = await loadApplicationsFromDb(db, userId, status);
    return mergeApplications(memoryApps, dbApps);
  } catch (error) {
    warnDatabaseFallback("list applications", error);
    return memoryApps;
  }
}

export async function getApplicationStats(
  userId: string,
): Promise<Record<string, number>> {
  const apps = await listApplications(userId);
  const stats: Record<string, number> = { total: apps.length };
  for (const app of apps) {
    stats[app.status] = (stats[app.status] ?? 0) + 1;
  }
  return stats;
}
