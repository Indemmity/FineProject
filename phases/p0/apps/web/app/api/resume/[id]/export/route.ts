import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth-options";
import { getResume } from "../../store";
import { getDb, resumes } from "@jobplatform/shared/db";
import { eq } from "drizzle-orm";
import { generatePDF } from "@jobplatform/shared/lib/pdf/generator";
import { generateComparisonPDF } from "@jobplatform/shared/lib/pdf/comparison";
import type { MatchResult } from "@jobplatform/shared/lib/services/analyzer";
import type { GuardrailResult } from "@jobplatform/shared/lib/services/guardrails";

function formatResumeAsHTML(filename: string, text: string): string {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  
  let html = `<div class="resume">`;
  
  // Extract name from filename (remove extension and underscores)
  const name = filename.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]/g, " ");
  html += `<h1 class="name">${name}</h1>`;
  
  let currentSection = "";
  let sectionContent: string[] = [];
  
  const flushSection = () => {
    if (currentSection && sectionContent.length > 0) {
      html += `<h2 class="section-title">${currentSection}</h2>`;
      html += `<div class="section-content">`;
      
      if (currentSection.toLowerCase().includes("skill")) {
        // Skills as comma-separated list
        html += `<p>${sectionContent.join(", ")}</p>`;
      } else if (currentSection.toLowerCase().includes("experience") || 
                 currentSection.toLowerCase().includes("employment") ||
                 currentSection.toLowerCase().includes("work")) {
        // Experience with job titles and companies
        let jobBlock: string[] = [];
        for (const line of sectionContent) {
          if (line.match(/^[A-Z][a-z]+ [A-Z]/) || line.includes(" at ") || line.includes("|")) {
            if (jobBlock.length > 0) {
              html += `<div class="job">`;
              html += `<div class="job-header">${jobBlock[0]}</div>`;
              if (jobBlock.length > 1) {
                html += `<ul>`;
                for (let i = 1; i < jobBlock.length; i++) {
                  html += `<li>${jobBlock[i]}</li>`;
                }
                html += `</ul>`;
              }
              html += `</div>`;
            }
            jobBlock = [line];
          } else {
            jobBlock.push(line);
          }
        }
        if (jobBlock.length > 0) {
          html += `<div class="job">`;
          html += `<div class="job-header">${jobBlock[0]}</div>`;
          if (jobBlock.length > 1) {
            html += `<ul>`;
            for (let i = 1; i < jobBlock.length; i++) {
              html += `<li>${jobBlock[i]}</li>`;
            }
            html += `</ul>`;
          }
          html += `</div>`;
        }
      } else if (currentSection.toLowerCase().includes("education")) {
        // Education section
        for (const line of sectionContent) {
          html += `<p class="education">${line}</p>`;
        }
      } else {
        // Generic section with bullet points
        html += `<ul>`;
        for (const line of sectionContent) {
          html += `<li>${line}</li>`;
        }
        html += `</ul>`;
      }
      
      html += `</div>`;
      sectionContent = [];
    }
  };
  
  const sectionHeadings = [
    /summary|objective|profile/i,
    /experience|employment|work history/i,
    /education|academic/i,
    /skills|technical skills|competencies/i,
    /projects/i,
    /certifications|licenses/i,
    /awards|achievements/i,
    /publications/i,
    /languages/i,
    /volunteer|community/i,
  ];
  
  for (const line of lines) {
    const isHeading = sectionHeadings.some(re => re.test(line));
    
    if (isHeading && line.length < 50) {
      flushSection();
      currentSection = line;
    } else if (currentSection) {
      sectionContent.push(line);
    } else {
      // Before first section - likely contact info
      if (line.includes("@") || line.match(/\(\d{3}\)/) || line.includes("linkedin")) {
        html += `<p class="contact">${line}</p>`;
      }
    }
  }
  
  flushSection();
  html += `</div>`;
  
  return html;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resume = await getResume(id);
  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const body = await request.json();
  const { type, tailoredText, analysis, guardrails } = body as {
    type: "tailored" | "comparison";
    tailoredText?: string;
    analysis?: MatchResult;
    guardrails?: GuardrailResult;
  };
  let resolvedTailoredText = normalizeTailoredText(tailoredText);

  if (!resolvedTailoredText) {
    resolvedTailoredText = await loadStoredTailoredText(id);
  }

  let pdfBuffer: Buffer;
  let filename: string;

  if (type === "comparison") {
    // Retrieve stored analysis if not provided in the request
    let score = analysis;
    let guardrailResult = guardrails;

    if (!score || !guardrailResult) {
      const db = getDb();
      if (db) {
        try {
          const rows = await db
            .select({
              matchScore: resumes.matchScore,
              gapAnalysis: resumes.gapAnalysis,
              tailoredText: resumes.tailoredText,
            })
            .from(resumes)
            .where(eq(resumes.id, id))
            .limit(1);
          if (rows.length > 0) {
            const row = rows[0]!;
            resolvedTailoredText ||= normalizeTailoredText(row.tailoredText);
            if (!score && row.matchScore !== null) {
              score = {
                score: row.matchScore,
                skillBreakdown: [],
                strengths: [],
                weaknesses: [],
              };
            }
          }
        } catch {
          // ignore
        }
      }
    }

    pdfBuffer = await generateComparisonPDF({
      originalText: resume.text,
      tailoredText: resolvedTailoredText ?? resume.text,
      score: score ?? { score: 0, skillBreakdown: [], strengths: [], weaknesses: [] },
      guardrails: guardrailResult ?? { passed: true, issues: [], severity: "low" },
    });
    filename = `Resume_Comparison_${id.slice(0, 8)}.pdf`;
  } else {
    // For tailored export: if no modifications, return original file; otherwise generate new PDF
    if (!resolvedTailoredText && resume.originalFileContent) {
      pdfBuffer = Buffer.from(resume.originalFileContent, 'base64');
      filename = resume.filename;
    } else {
      const content = resolvedTailoredText ?? resume.text;
      const html = formatResumeAsHTML(resume.filename, content);
      pdfBuffer = await generatePDF(html, { title: resume.filename });
      filename = `Resume_Tailored_${id.slice(0, 8)}.pdf`;
    }
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length.toString(),
    },
  });
}

function normalizeTailoredText(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value.trim() ? value.trim() : undefined;
  }

  if (value && typeof value === "object") {
    const record = value as { tailored?: unknown };
    if (typeof record.tailored === "string" && record.tailored.trim()) {
      return record.tailored.trim();
    }
  }

  return undefined;
}

async function loadStoredTailoredText(id: string): Promise<string | undefined> {
  const db = getDb();
  if (!db) {
    return undefined;
  }

  try {
    const rows = await db
      .select({
        tailoredText: resumes.tailoredText,
      })
      .from(resumes)
      .where(eq(resumes.id, id))
      .limit(1);

    if (rows.length === 0) {
      return undefined;
    }

    return normalizeTailoredText(rows[0]!.tailoredText);
  } catch {
    return undefined;
  }
}
