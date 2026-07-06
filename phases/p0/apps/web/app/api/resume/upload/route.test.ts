// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const parseResume = vi.fn();
  const getDb = vi.fn();
  const getServerSession = vi.fn();
  const saveResume = vi.fn();

  return {
    parseResume,
    getDb,
    getServerSession,
    saveResume,
  };
});

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@jobplatform/shared/lib/resume/parser", () => ({
  parseResume: mocks.parseResume,
}));

vi.mock("@jobplatform/shared/db", () => ({
  getDb: mocks.getDb,
  resumes: { id: "resume-id" },
}));

vi.mock("../../auth/auth-options", () => ({
  authOptions: {},
}));

vi.mock("../store", () => ({
  saveResume: mocks.saveResume,
}));

import { POST } from "./route";

function buildUploadRequest(
  filename = "resume.pdf",
  content = "Hello world",
  type = "application/pdf",
) {
  const formData = new FormData();
  formData.append("file", new File([Buffer.from(content)], filename, { type }));

  return new Request("http://localhost/api/resume/upload", {
    method: "POST",
    body: formData,
  });
}

describe("POST /api/resume/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getDb.mockReturnValue(null);
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-123" } });
    mocks.parseResume.mockResolvedValue({
      text: "Tailored resume text",
      format: "pdf",
      sections: [{ heading: "general", content: "Tailored resume text" }],
    });
    mocks.saveResume.mockReturnValue({ id: "resume-456" });
  });

  it("parses the uploaded resume and returns the saved resume response", async () => {
    const request = buildUploadRequest();

    const response = await POST(request as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "resume-456",
      filename: "resume.pdf",
      size: Buffer.from("Hello world").length,
      format: "pdf",
      text: "Tailored resume text",
      sections: [{ heading: "general", content: "Tailored resume text" }],
      wordCount: 3,
    });
    expect(mocks.parseResume).toHaveBeenCalledTimes(1);

    const [buffer, filename] = mocks.parseResume.mock.calls[0] ?? [];
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect((buffer as Buffer).toString("utf8")).toBe("Hello world");
    expect(filename).toBe("resume.pdf");

    expect(mocks.saveResume).toHaveBeenCalledWith(
      "user-123",
      "resume.pdf",
      "pdf",
      "Tailored resume text",
      3,
      "SGVsbG8gd29ybGQ=",
    );
  });

  it("rejects unauthorized requests before parsing the file", async () => {
    mocks.getServerSession.mockResolvedValueOnce(null);

    const request = buildUploadRequest();
    const response = await POST(request as Parameters<typeof POST>[0]);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: "Unauthorized" });
    expect(mocks.parseResume).not.toHaveBeenCalled();
    expect(mocks.saveResume).not.toHaveBeenCalled();
  });
});
