import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth-options";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json(session || null);
  } catch (error) {
    console.error('[session] Error fetching session:', error);
    return NextResponse.json(null, { status: 200 });
  }
}
