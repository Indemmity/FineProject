import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth-options";
import { getResume } from "../../store";
import { getDb, resumes } from "@jobplatform/shared/db";
import { eq } from "drizzle-orm";
import { generatePDF } from "@jobplatform/shared/lib/pdf/generator";
import { generateComparisonPDF } from "@jobplatform/shared/lib/pdf/comparison";
import { generatePDFWithPuppeteer, type ResumeData } from "@jobplatform/shared/lib/pdf/puppeteer-generator";
import type { MatchResult } from "@jobplatform/shared/lib/services/analyzer";
import type { GuardrailResult } from "@jobplatform/shared/lib/services/guardrails";

function formatExperienceContent(lines: string[]): string {
  let html = "";
  let currentJob: string[] = [];
  
  for (const line of lines) {
    // Detect job headers (company names, positions, dates)
    if (line.match(/^[A-Z][a-z]+ [A-Z]/) || line.includes(" at ") || line.includes("|") || 
        line.match(/\d{4}/) || line.match(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)) {
      if (currentJob.length > 0) {
        html += formatJobBlock(currentJob);
      }
      currentJob = [line];
    } else {
      currentJob.push(line);
    }
  }
  
  if (currentJob.length > 0) {
    html += formatJobBlock(currentJob);
  }
  
  return html;
}

function formatJobBlock(jobLines: string[]): string {
  if (jobLines.length === 0) return "";
  
  const header = jobLines[0];
  const bullets = jobLines.slice(1);
  
  let html = `<div class="job">
    <div class="job-header">${header}</div>`;
  
  if (bullets.length > 0) {
    html += `<ul class="job-bullets">`;
    for (const bullet of bullets) {
      if (bullet.trim()) {
        html += `<li>${bullet}</li>`;
      }
    }
    html += `</ul>`;
  }
  
  html += `</div>`;
  return html;
}

function formatEducationContent(lines: string[]): string {
  let html = "";
  
  for (const line of lines) {
    if (line.trim()) {
      html += `<div class="education-item">
        <div class="education-degree">${line}</div>
      </div>`;
    }
  }
  
  return html;
}

function formatSkillsContent(lines: string[]): string {
  let html = "";
  
  for (const line of lines) {
    const skills = line.split(/,|•|\n/).map(s => s.trim()).filter(s => s);
    for (const skill of skills) {
      html += `<li>${skill}</li>`;
    }
  }
  
  return html;
}

function parseResumeData(filename: string, text: string): ResumeData {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  
  // Extract name from filename
  const name = filename.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]/g, " ");
  
  let contact = "";
  let summary = "";
  let experience = "";
  let education = "";
  let skills = "";
  
  let currentSection = "";
  let sectionContent: string[] = [];
  
  const sectionHeadings = [
    /summary|objective|profile/i,
    /experience|employment|work history/i,
    /education|academic/i,
    /skills|technical skills|competencies/i,
  ];
  
  const flushSection = () => {
    if (currentSection && sectionContent.length > 0) {
      const content = sectionContent.join("\n");
      
      if (currentSection.toLowerCase().includes("summary") || 
          currentSection.toLowerCase().includes("objective") ||
          currentSection.toLowerCase().includes("profile")) {
        summary = content;
      } else if (currentSection.toLowerCase().includes("experience") || 
                 currentSection.toLowerCase().includes("employment") ||
                 currentSection.toLowerCase().includes("work")) {
        experience = formatExperienceContent(sectionContent);
      } else if (currentSection.toLowerCase().includes("education")) {
        education = formatEducationContent(sectionContent);
      } else if (currentSection.toLowerCase().includes("skill")) {
        skills = formatSkillsContent(sectionContent);
      }
      
      sectionContent = [];
    }
  };
  
  for (const line of lines) {
    const isHeading = sectionHeadings.some(re => re.test(line));
    
    if (isHeading && line.length < 50) {
      flushSection();
      currentSection = line;
    } else if (currentSection) {
      sectionContent.push(line);
    } else {
      // Before first section - collect contact info
      if (line.includes("@") || line.match(/\(\d{3}\)/) || line.includes("linkedin") || 
          line.includes("phone") || line.includes("email") || line.includes("http")) {
        contact += (contact ? " | " : "") + line;
      } else if (line.length > 20 && !line.match(/^[A-Z][a-z]+ [A-Z]/)) {
        // Likely summary/professional profile text
        summary += (summary ? " " : "") + line;
      }
    }
  }
  
  flushSection();
  
  return {
    name,
    contact,
    summary,
    experience,
    education,
    skills,
  };
}

function formatResumeAsHTML(filename: string, text: string): string {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l);
  
  let html = `<div class="resume">`;
  
  // Extract name from filename (remove extension and underscores)
  const name = filename.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]/g, " ");
  html += `<h1 class="name">${name}</h1>`;
  
  let currentSection = "";
  let sectionContent: string[] = [];
  let contactInfo: string[] = [];
  let summaryContent: string[] = [];
  
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
          // Better job detection: lines with company indicators, dates, or role patterns
          if (line.match(/^[A-Z][a-z]+ [A-Z]/) || line.includes(" at ") || line.includes("|") || 
              line.match(/\d{4}/) || line.match(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)) {
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
        // Education section - better formatting
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
      // Before first section - collect contact info and summary
      if (line.includes("@") || line.match(/\(\d{3}\)/) || line.includes("linkedin") || 
          line.includes("phone") || line.includes("email") || line.includes("http")) {
        contactInfo.push(line);
      } else if (line.length > 20 && !line.match(/^[A-Z][a-z]+ [A-Z]/)) {
        // Likely summary/professional profile text
        summaryContent.push(line);
      }
    }
  }
  
  flushSection();
  
  // Add contact info after name
  if (contactInfo.length > 0) {
    html = html.replace(`<h1 class="name">${name}</h1>`, 
      `<h1 class="name">${name}</h1><p class="contact">${contactInfo.join(" • ")}</p>`);
  }
  
  // Add summary section if exists
  if (summaryContent.length > 0) {
    html = html.replace(`<h1 class="name">${name}</h1>`, 
      `<h1 class="name">${name}</h1><p class="contact">${contactInfo.join(" • ")}</p><p class="summary">${summaryContent.join(" ")}</p>`);
  }
  
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
  const { type, tailoredText, analysis, guardrails, theme } = body as {
    type: "tailored" | "comparison";
    tailoredText?: string;
    analysis?: MatchResult;
    guardrails?: GuardrailResult;
    theme?: 'professional' | 'modern' | 'classic' | 'minimal' | null;
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
      
      // Use puppeteer with specific template if specified, otherwise use professional template, fallback to jsPDF
      if (theme && theme !== 'professional') {
        try {
          const resumeData = parseResumeData(resume.filename, content);
          pdfBuffer = await generatePDFWithPuppeteer({ data: resumeData, template: theme as any });
          filename = `Resume_Tailored_${theme}_${id.slice(0, 8)}.pdf`;
        } catch (error) {
          console.error('Puppeteer PDF generation failed, falling back to jsPDF:', error);
          const html = formatResumeAsHTML(resume.filename, content);
          pdfBuffer = await generatePDF(html, { title: resume.filename });
          filename = `Resume_Tailored_${id.slice(0, 8)}.pdf`;
        }
      } else {
        try {
          const resumeData = parseResumeData(resume.filename, content);
          pdfBuffer = await generatePDFWithPuppeteer({ data: resumeData });
          filename = `Resume_Tailored_${id.slice(0, 8)}.pdf`;
        } catch (error) {
          console.error('Puppeteer PDF generation failed, falling back to jsPDF:', error);
          const html = formatResumeAsHTML(resume.filename, content);
          pdfBuffer = await generatePDF(html, { title: resume.filename });
          filename = `Resume_Tailored_${id.slice(0, 8)}.pdf`;
        }
      }
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
