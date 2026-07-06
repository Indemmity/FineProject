import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/auth-options";
import {
  createApplication,
  getApplication,
  updateApplication,
  transitionStatus,
  deleteApplication,
  listApplications,
} from "@jobplatform/shared/lib/services/applications";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const status = searchParams.get("status");

  const userId = (session.user as Record<string, string>).id ?? session.user.email ?? "unknown";

  if (id) {
    const app = await getApplication(id);
    if (!app) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    return NextResponse.json(app);
  }

  const apps = await listApplications(userId, status as never);
  return NextResponse.json({ applications: apps });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as Record<string, string>).id ?? session.user.email ?? "unknown";

  const body = await request.json();
  const { jobId, resumeId } = body as { jobId: string; resumeId?: string };

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const app = await createApplication(userId, jobId, resumeId);
  return NextResponse.json(app, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { id, status, notes, matchScore, resumeId, gapAnalysis, tailoredResumeText } = body as {
    id: string;
    status?: string;
    notes?: string;
    matchScore?: number;
    resumeId?: string;
    gapAnalysis?: unknown[];
    tailoredResumeText?: string;
  };

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    if (status) {
      const transitioned = await transitionStatus(id, status as never, notes);
      const updates: Record<string, unknown> = {};
      if (notes !== undefined) updates.notes = notes;
      if (matchScore !== undefined) updates.matchScore = matchScore;
      if (resumeId !== undefined) updates.resumeId = resumeId;
      if (gapAnalysis !== undefined) updates.gapAnalysis = gapAnalysis;
      if (tailoredResumeText !== undefined) updates.tailoredResumeText = tailoredResumeText;

      if (Object.keys(updates).length === 0) {
        return NextResponse.json(transitioned);
      }

      const app = await updateApplication(id, updates);
      return NextResponse.json(app);
    }
    const updates: Record<string, unknown> = {};
    if (notes !== undefined) updates.notes = notes;
    if (matchScore !== undefined) updates.matchScore = matchScore;
    if (resumeId !== undefined) updates.resumeId = resumeId;
    if (gapAnalysis !== undefined) updates.gapAnalysis = gapAnalysis;
    if (tailoredResumeText !== undefined) updates.tailoredResumeText = tailoredResumeText;
    const app = await updateApplication(id, updates);
    return NextResponse.json(app);
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const deleted = await deleteApplication(id);
  if (!deleted) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Application deleted" });
}

export async function OPTIONS() {
  return NextResponse.json({});
}
