import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth-options";
import { getResume } from "../../store";
import { getDb, resumes } from "@jobplatform/shared/db";
import { eq } from "drizzle-orm";
import { tailorResume } from "@jobplatform/shared/lib/services/tailor";
import { computeDiff } from "@jobplatform/shared/lib/services/diff";
import { checkGuardrails } from "@jobplatform/shared/lib/services/guardrails";

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
  const { jdText } = body as { jdText: string };

  if (!jdText) {
    return NextResponse.json({ error: "jdText is required" }, { status: 400 });
  }

  try {
    // Run tailoring pipeline
    const tailored = await tailorResume(resume.text, jdText);

    // Compute diff
    const tailoredText = tailored.sections.map((s) => s.tailored).join("\n");
    const diff = computeDiff(resume.text, tailoredText);

    // Check guardrails
    const guardrails = await checkGuardrails(resume.text, tailoredText);

    // Sanitize tailored text to remove null bytes that cause PostgreSQL encoding errors
    const sanitizedTailoredText = tailoredText.replace(/\x00/g, '');
    const sanitizedSections = tailored.sections.map(section => ({
      ...section,
      original: section.original.replace(/\x00/g, ''),
      tailored: section.tailored.replace(/\x00/g, ''),
      reason: section.reason.replace(/\x00/g, ''),
    }));

    // Persist tailored text if database is available
    const db = getDb();
    if (db) {
      try {
        await db
          .update(resumes)
          .set({
            tailoredText: { tailored: sanitizedTailoredText, sections: sanitizedSections },
          })
          .where(eq(resumes.id, id))
          .execute();
      } catch {
        // Non-critical
      }
    }

    return NextResponse.json({
      original: resume.text,
      tailored: sanitizedTailoredText,
      sections: sanitizedSections,
      stats: tailored.stats,
      diff,
      guardrails,
      resumeId: id,
    });
  } catch (e) {
    console.error("[resume/tailor] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Tailoring failed" },
      { status: 500 },
    );
  }
}