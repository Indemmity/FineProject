/**
 * Follow-up scheduler — schedules follow-up reminders based on application timeline.
 *
 * In production this would integrate with a job scheduler (Bull/Cron).
 * Current implementation provides the scheduling logic and an in-memory queue.
 */

interface FollowUp {
  applicationId: string;
  userId: string;
  type: "initial" | "follow_up_3d" | "follow_up_7d" | "follow_up_14d";
  scheduledAt: Date;
  completed: boolean;
}

const followUps: FollowUp[] = [];

export function scheduleFollowUps(
  applicationId: string,
  userId: string,
  sentAt: Date,
): FollowUp[] {
  const scheduled: FollowUp[] = [
    {
      applicationId,
      userId,
      type: "follow_up_3d",
      scheduledAt: new Date(sentAt.getTime() + 3 * 24 * 60 * 60 * 1000),
      completed: false,
    },
    {
      applicationId,
      userId,
      type: "follow_up_7d",
      scheduledAt: new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      completed: false,
    },
    {
      applicationId,
      userId,
      type: "follow_up_14d",
      scheduledAt: new Date(sentAt.getTime() + 14 * 24 * 60 * 60 * 1000),
      completed: false,
    },
  ];

  followUps.push(...scheduled);
  return scheduled;
}

export function getPendingFollowUps(userId: string): FollowUp[] {
  const now = new Date();
  return followUps.filter(
    (f) => f.userId === userId && !f.completed && f.scheduledAt <= now,
  );
}

export function markFollowUpDone(applicationId: string, type: string): boolean {
  const found = followUps.find(
    (f) => f.applicationId === applicationId && f.type === type,
  );
  if (found) {
    found.completed = true;
    return true;
  }
  return false;
}