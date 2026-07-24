import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export interface ParsedResume {
  text: string;
  sections: ResumeSection[];
  format: "pdf" | "docx" | "txt";
}

export interface ResumeSection {
  heading: string;
  content: string;
}

const SECTION_HEADINGS = [
  /^(education|academic|qualifications?)/i,
  /^(experience|work\s*experience|employment|professional\s*experience)/i,
  /^(skills|technical\s*skills|core\s*competencies|technologies)/i,
  /^(projects?|personal\s*projects?|open\s*source)/i,
  /^(certifications?|licenses?|credentials?)/i,
  /^(summary|professional summary|objective|profile|about me)/i,
  /^(publications?|research|papers?)/i,
  /^(languages?)/i,
  /^(awards?|honors?|achievements?)/i,
  /^(volunteering|volunteer|community)/i,
  /^(references?)/i,
];

export async function parseResume(
  buffer: Buffer,
  filename: string,
): Promise<ParsedResume> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";

  if (ext === "pdf") {
    return parsePDF(buffer);
  }
  if (ext === "docx") {
    return parseDOCX(buffer);
  }
  return parseText(buffer);
}

async function parsePDF(buffer: Buffer): Promise<ParsedResume> {
  // Set worker source to prevent Turbopack bundling issues
  if (!PDFParse.setWorker()) {
    const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
    PDFParse.setWorker(workerPath);
  }
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const trimmedText = (result.text ?? "").trim();

    return {
      text: trimmedText,
      sections: extractSections(trimmedText),
      format: "pdf",
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function parseDOCX(buffer: Buffer): Promise<ParsedResume> {
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    sections: extractSections(result.value),
    format: "docx",
  };
}

function parseText(buffer: Buffer): ParsedResume {
  const text = buffer.toString("utf-8");
  return {
    text,
    sections: extractSections(text),
    format: "txt",
  };
}

export function extractSections(text: string): ResumeSection[] {
  const lines = text.split("\n");
  const sections: ResumeSection[] = [];
  let currentHeading = "general";
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const matched = SECTION_HEADINGS.find((re) => re.test(trimmed));
    if (matched) {
      if (currentContent.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
        });
        currentContent = [];
      }
      currentHeading = trimmed;
    } else {
      currentContent.push(trimmed);
    }
  }

  if (currentContent.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections;
}
