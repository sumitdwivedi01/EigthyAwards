import { NextResponse, type NextRequest } from "next/server";

/**
 * A coarse gate (Next.js 16's proxy, formerly middleware): a visitor without a session cookie is
 * sent to the login page before a signed-in page loads. It never decides permissions; the API does
 * that on every request, and an expired or revoked session still gets a 401 there.
 */
const SESSION_COOKIE = "awards_session";

export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/home", "/me/:path*", "/applicant/:path*", "/staff/:path*", "/jury/:path*", "/department/:path*", "/leader/:path*"],
};
