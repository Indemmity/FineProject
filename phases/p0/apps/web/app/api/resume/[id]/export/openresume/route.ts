import { NextRequest, NextResponse } from "next/server";
import { OpenResumeTemplate } from "@/components/resume/OpenResumeTemplate";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ResumeData } from "@jobplatform/shared/lib/resume/extractor";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const body = await request.json();
    const { tailoredText, resumeData } = body;

    // Use provided resume data or create fallback
    const finalData: ResumeData = resumeData || {
      name: "Your Name",
      email: "your.email@example.com",
      phone: "Your Phone",
      location: "Your Location",
      summary: tailoredText?.substring(0, 500) || "",
      experience: [],
      education: [],
      skills: [],
    };

    // Generate PDF using OpenResume template
    const pdfBuffer = await renderToBuffer(
      OpenResumeTemplate({ data: finalData })
    );

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="resume-${params.id}-openresume.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("OpenResume PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate OpenResume PDF" },
      { status: 500 }
    );
  }
}
