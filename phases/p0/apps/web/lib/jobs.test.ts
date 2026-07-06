import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSearchKeywords,
  matchesJobQuery,
  normalizeExperienceLevel,
  normalizeWorkMode,
  searchJobs,
  toFrontendJob,
} from "./jobs";

describe("jobs helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes work modes for filters", () => {
    expect(normalizeWorkMode("Remote")).toBe("remote");
    expect(normalizeWorkMode("On-site")).toBe("onsite");
    expect(normalizeWorkMode("Fully hybrid")).toBe("hybrid");
  });

  it("normalizes experience levels for filters", () => {
    expect(normalizeExperienceLevel("Entry Level")).toBe("entry");
    expect(normalizeExperienceLevel("Mid Level")).toBe("mid");
    expect(normalizeExperienceLevel("Lead / Manager")).toBe("lead");
  });

  it("builds searchable keywords from a free-form query", () => {
    expect(buildSearchKeywords("Senior Frontend Engineer, React")).toEqual([
      "senior",
      "frontend",
      "engineer",
      "react",
    ]);
  });

  it("maps harvester jobs into frontend jobs", () => {
    const job = toFrontendJob({
      id: "job-1",
      source: "remoteok",
      source_id: "source-1",
      title: "Senior Frontend Engineer",
      company: "Acme Corp",
      location: "San Francisco, CA",
      description: "Build and maintain the product.",
      description_html: "<p>Build and maintain the product.</p>",
      salary_range: "$150k - $200k",
      job_type: "full-time",
      remote: true,
      experience_level: "senior",
      posted_date: "2026-07-01T00:00:00.000Z",
      url: "https://example.com/job-1",
      search_keyword: "frontend",
      scraped_at: "2026-07-02T00:00:00.000Z",
    });

    expect(job).toMatchObject({
      id: "job-1",
      source: "RemoteOK",
      remote: "Remote",
      experience: "Senior",
      postedAt: "2026-07-01T00:00:00.000Z",
      location: "San Francisco, CA",
      salary: "$150k - $200k",
    });
  });

  it("matches jobs by exact phrases, keyword tokens, and location", () => {
    expect(
      matchesJobQuery(
        {
          title: "Senior Frontend Engineer",
          company: "Acme Corp",
          location: "San Francisco, CA",
          description: "Build and maintain the product.",
        },
        "Frontend Engineer",
      ),
    ).toBe(true);
    expect(
      matchesJobQuery(
        {
          title: "Senior Frontend Engineer",
          company: "Acme Corp",
          location: "San Francisco, CA",
          description: "Build and maintain the product.",
        },
        "mobile",
      ),
    ).toBe(false);
    expect(
      matchesJobQuery(
        {
          title: "Data Scientist",
          company: "DataFlow Labs",
          location: "Bangalore, India",
          description: "Apply machine learning to solve complex business problems.",
        },
        "India",
      ),
    ).toBe(true);
  });

  it("searches by location keywords when the free-form query is empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        search_id: "search-1",
        status: "running",
        progress: 100,
        results: [],
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    await searchJobs({
      query: "",
      location: "Bangalore, India",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toContain("/api/jobs/search?");
    expect(String(url)).toContain("q=bangalore%2Cindia");
    expect(String(url)).toContain("location=Bangalore%2C+India");
    expect(init).toEqual({ cache: "no-store" });
  });
});
