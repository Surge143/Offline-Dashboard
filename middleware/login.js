import { NextResponse } from "next/server";


export function middleware(request) {
  const { pathname } = request.nextUrl;

  const publicPaths = ["/login", "/api/", "/_next", "/favicon.ico", "/public"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const tokenCookie = request.cookies.get("offline_token") || request.cookies.get("payload_token") || request.cookies.get("payload-token") || request.cookies.get("token");
  const token = tokenCookie ? tokenCookie.value : null;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/((?!_next|api|login|static).*)"],
};
