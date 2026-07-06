import { describe, expect, it } from "vitest";
import { toDeliveryEntry, toQueueItem } from "./outreach";

describe("outreach helpers", () => {
  const log = {
    id: "log-1",
    application_id: "app-1",
    user_id: "user-1",
    recipient_email: "jane@example.com",
    recipient_name: "Jane Doe",
    subject: "Hello there",
    subject_hash: "abcdef1234567890",
    status: "sent",
    delivery_status: "pending",
    error_message: null,
    sent_at: "2026-07-04T00:00:00.000Z",
    opened_at: null,
    replied_at: null,
  };

  it("maps closer logs into queue items", () => {
    expect(toQueueItem(log)).toEqual({
      id: "log-1",
      recipient: "Jane Doe <jane@example.com>",
      subject: "Hello there",
      status: "queued",
      createdAt: "2026-07-04T00:00:00.000Z",
    });
  });

  it("maps closer logs into delivery entries", () => {
    expect(toDeliveryEntry(log)).toEqual({
      id: "log-1",
      recipient: "Jane Doe <jane@example.com>",
      subject: "Hello there",
      sentAt: "2026-07-04T00:00:00.000Z",
      status: "sent",
      deliveryStatus: "pending",
    });
  });
});
