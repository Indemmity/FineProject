import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@jobplatform/shared/lib/resume/parser";
import { getDb, resumes } from "@jobplatform/shared/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/auth-options";
import { saveResume } from "../store";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as Record<string, unknown>).id as string;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}. Allowed: PDF, DOCX, TXT` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB" },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parsed = await parseResume(buffer, file.name);
    const wordCount = parsed.text.split(/\s+/).filter(Boolean).length;
    
    // Store original file as base64 for later download
    const originalFileContent = buffer.toString('base64');

    // Try to persist to database; fall back to in-memory store
    const db = getDb();
    let resumeId: string;

    if (db) {
      try {
        const [inserted] = await db
          .insert(resumes)
          .values({
            userId,
            originalFilePath: file.name,
            parsedText: parsed.text,
            originalFileContent,
          })
          .returning({ id: resumes.id });
        resumeId = inserted!.id;
      } catch (e) {
        console.warn("[resume/upload] DB insert failed, falling back to in-memory store:", e);
        const stored = saveResume(userId, file.name, parsed.format, parsed.text, wordCount, originalFileContent);
        resumeId = stored.id;
      }
    } else {
      const stored = saveResume(userId, file.name, parsed.format, parsed.text, wordCount, originalFileContent);
      resumeId = stored.id;
    }

    return NextResponse.json({
      id: resumeId,
      filename: file.name,
      size: file.size,
      format: parsed.format,
      text: parsed.text,
      sections: parsed.sections,
      wordCount,
    });
  } catch (e) {
    console.error("[resume/upload] Unhandled error:", e);
    if (e instanceof Error) {
      console.error("[resume/upload] Stack:", e.stack);
      console.error("[resume/upload] Cause:", (e as any).cause);
    }
    return NextResponse.json(
      {
        error: "An unexpected error occurred while processing your resume.",
        debug: e instanceof Error ? e.message : String(e),
      },
      { status: 500 },
    );
  }
}