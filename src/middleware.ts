import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for session token (NextAuth stores it in cookies)
  const sessionToken = request.cookies.get("authjs.session-token")?.value ||
                       request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  const isApiRoute = pathname.startsWith("/api");
  const isPublicRoute = pathname === "/";
  const isPublicAsset = pathname.startsWith("/_next") ||
                        pathname.startsWith("/favicon") ||
                        pathname.endsWith(".json") ||
                        pathname.endsWith(".png") ||
                        pathname.endsWith(".ico");

  // Allow API routes and public assets
  if (isApiRoute || isPublicAsset) {
    return NextResponse.next();
  }

  // Redirect to dashboard if logged in and trying to access auth pages
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect to login if not logged in and trying to access protected pages
  if (!isLoggedIn && !isAuthPage && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
