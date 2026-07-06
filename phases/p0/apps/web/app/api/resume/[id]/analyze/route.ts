import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/auth-options";
import { getResume } from "../../store";
import { getDb, resumes } from "@jobplatform/shared/db";
import { eq } from "drizzle-orm";
import { analyzeResume } from "@jobplatform/shared/lib/services/analyzer";
import { analyzeGaps } from "@jobplatform/shared/lib/services/gap-analyzer";

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
  const { jobId, jdText } = body as { jobId?: string; jdText: string };

  if (!jdText) {
    return NextResponse.json({ error: "jdText is required" }, { status: 400 });
  }

  try {
    const [analysis, gaps] = await Promise.all([
      analyzeResume(resume.text, jdText),
      analyzeGaps(resume.text, jdText),
    ]);

    // Persist analysis results if database is available
    const db = getDb();
    if (db) {
      try {
        await db
          .update(resumes)
          .set({
            matchScore: analysis.score,
            gapAnalysis: gaps,
          })
          .where(eq(resumes.id, id))
          .execute();
      } catch {
        // Non-critical — analysis still works without persistence
      }
    }

    return NextResponse.json({ analysis, gaps, resumeId: id, jobId: jobId ?? null });
  } catch (e) {
    console.error("[resume/analyze] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Analysis failed" },
      { status: 500 },
    );
  }
}