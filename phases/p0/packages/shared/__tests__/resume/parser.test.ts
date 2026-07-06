import { describe, it, expect, vi, beforeEach } from "vitest";

const pdfParseMocks = vi.hoisted(() => {
  const getText = vi.fn();
  const destroy = vi.fn().mockResolvedValue(undefined);
  const PDFParse = vi.fn().mockImplementation(function (this: unknown, options: unknown) {
    Object.assign(this as Record<string, unknown>, {
      options,
      getText,
      destroy,
    });
  });

  return {
    PDFParse,
    getText,
    destroy,
  };
});

vi.mock("pdf-parse", () => ({
  PDFParse: pdfParseMocks.PDFParse,
}));

import { extractSections, parseResume } from "../../lib/resume/parser";

describe("extractSections", () => {
  it("extracts sections from a resume with headings", () => {
    const text = [
      "Professional Summary",
      "Experienced software engineer with 5 years of experience.",
      "Experience",
      "Built web apps at Acme Corp.",
      "Education",
      "BSc Computer Science",
      "Skills",
      "TypeScript, React, Node.js",
    ].join("\n");

    const sections = extractSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(3);

    const experience = sections.find((s) =>
      s.heading.toLowerCase().includes("experience"),
    );
    expect(experience).toBeDefined();
    expect(experience?.content).toContain("Acme");
  });

  it("returns a general section for text without headings", () => {
    const text = "Just some plain text\nwith multiple lines.";
    const sections = extractSections(text);
    expect(sections.length).toBeGreaterThanOrEqual(1);
    expect(sections[0]!.heading).toBe("general");
  });

  it("handles empty text", () => {
    const sections = extractSections("");
    expect(sections).toEqual([]);
  });
});

describe("parseResume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("parses a TXT resume", async () => {
    const buf = Buffer.from("My name is John\n\nExperience\nWorked at Google");
    const result = await parseResume(buf, "resume.txt");
    expect(result.format).toBe("txt");
    expect(result.text).toContain("John");
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
  });

  it("parses a PDF resume with pdf-parse load parameters", async () => {
    const buf = Buffer.from("%PDF-1.4\nfake pdf bytes");
    pdfParseMocks.getText.mockResolvedValue({
      text: "PDF Resume\nExperience\nBuilt products",
    });

    const result = await parseResume(buf, "resume.pdf");

    expect(pdfParseMocks.PDFParse).toHaveBeenCalledWith(
      expect.objectContaining({ data: buf }),
    );
    expect(pdfParseMocks.getText).toHaveBeenCalledTimes(1);
    expect(pdfParseMocks.destroy).toHaveBeenCalledTimes(1);
    expect(result.format).toBe("pdf");
    expect(result.text).toContain("PDF Resume");
    expect(result.sections[0]?.heading).toBe("general");
  });

  it("falls back to txt for unknown format", async () => {
    const buf = Buffer.from("some content");
    const result = await parseResume(buf, "resume.xyz");
    expect(result.format).toBe("txt");
  });
});
