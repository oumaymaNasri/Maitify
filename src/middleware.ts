import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { decodeSessionCookie, SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

const TECHNICIAN_BLOCKED_PREFIXES = ["/technicians", "/stock", "/parts"];

export function middleware(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!raw) return NextResponse.next();

  const session = decodeSessionCookie(raw);
  if (session?.role !== "TECHNICIEN") return NextResponse.next();

  const path = request.nextUrl.pathname;
  if (TECHNICIAN_BLOCKED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/technicians/:path*", "/stock/:path*", "/parts/:path*"],
};
