import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./lib/auth"

// Public routes that don't require auth
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/leaderboard",
  "/api/invite",
  "/api/leaderboard",
  "/api/auth",
  "/INSTRUCTIONS.md",
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

  // Check authentication
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Admin route protection
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url))
    }
  }

  // Candidate-specific protections
  if (
    session.user.role === "CANDIDATE" &&
    (pathname.startsWith("/assessment") ||
     pathname.startsWith("/problems") ||
     pathname.startsWith("/submissions") ||
     pathname.startsWith("/instructions") ||
     pathname.startsWith("/dashboard"))
  ) {
    return NextResponse.next()
  }

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
