// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getDb = vi.fn();

  return {
    getDb,
  };
});

vi.mock("../../db", () => ({
  getDb: mocks.getDb,
  applications: {},
  timelineEvents: {},
}));

import {
  createApplication,
  deleteApplication,
  getApplication,
  getApplicationStats,
  listApplications,
  transitionStatus,
  updateApplication,
} from "../../lib/services/applications";

describe("application service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDb.mockReturnValue(null);
  });

  it("creates, updates, transitions, and deletes applications in memory fallback", async () => {
    const application = await createApplication("user-1", "job-1", "resume-1");

    expect(application).toMatchObject({
      userId: "user-1",
      jobId: "job-1",
      resumeId: "resume-1",
      status: "discovered",
      notes: "",
      createdAt: application.updatedAt,
    });
    expect(application.timeline).toHaveLength(1);
    expect(application.timeline[0]).toMatchObject({
      event: "application.created",
      detail: "Application created from job discovery",
      source: "system",
    });

    const listed = await listApplications("user-1");
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe(application.id);

    const fetched = await getApplication(application.id);
    expect(fetched?.id).toBe(application.id);

    const originalUpdatedAt = application.updatedAt;
    const updated = await updateApplication(application.id, {
      notes: "Updated notes",
      matchScore: 88,
      tailoredResumeText: "Tailored resume text",
    });
    expect(updated).toMatchObject({
      notes: "Updated notes",
      matchScore: 88,
      tailoredResumeText: "Tailored resume text",
    });
    expect(updated.updatedAt).not.toBe(originalUpdatedAt);

    const transitioned = await transitionStatus(
      application.id,
      "analyzed",
      "Ready for review",
    );
    expect(transitioned.status).toBe("analyzed");
    expect(transitioned.timeline).toHaveLength(2);
    expect(transitioned.timeline[1]).toMatchObject({
      event: "status.analyzed",
      detail: "Ready for review",
      source: "user",
    });

    const stats = await getApplicationStats("user-1");
    expect(stats.total).toBe(1);
    expect(stats.analyzed).toBe(1);

    const deleted = await deleteApplication(application.id);
    expect(deleted).toBe(true);

    const missing = await getApplication(application.id);
    expect(missing).toBeUndefined();
  });

  it("rejects invalid status transitions", async () => {
    const application = await createApplication("user-2", "job-2");

    await expect(
      transitionStatus(application.id, "offer"),
    ).rejects.toThrow(/Invalid transition/);

    await deleteApplication(application.id);
  });
});
