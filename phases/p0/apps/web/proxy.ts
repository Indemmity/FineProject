import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/_next", "/favicon.ico"];
const authApiPaths = ["/api/auth", "/api/jobs", "/api/outreach", "/api/applications"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    publicPaths.some((p) => pathname.startsWith(p)) ||
    authApiPaths.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/api/")) {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
