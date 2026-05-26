import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes that don't require auth
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/leaderboard",
  "/api/invite",
  "/api/leaderboard",
  "/api/auth",
]

// Admin-only routes
const adminRoutes = ["/admin"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Allow Next.js internal routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next()
  }

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    return NextResponse.next()
  }

  // Check for session token (JWT in cookies)
  const sessionToken =
    req.cookies.get("next-auth.session-token")?.value ||
    req.cookies.get("__Secure-next-auth.session-token")?.value

  if (!sessionToken) {
    // Not authenticated — redirect to login
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // NOTE: Full auth verification (JWT decode + role check) will be added
  // in Cycle 02 after auth.ts is configured with NextAuth.
  // For now, admin routes are protected by the session check above.

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon\\.ico|assets).*)",
  ],
}
