"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Menu, X } from "lucide-react"

export default function Navbar() {
  const { data: session } = useSession()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold tracking-tight shrink-0">
            olais<span className="text-primary">.eval</span>
          </Link>
          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/leaderboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Leaderboard
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Admin
              </Link>
            )}
            {session?.user?.role === "CANDIDATE" && (
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
            )}
          </div>
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden md:flex items-center gap-3">
          {session?.user ? (
            <>
              <span className="text-sm text-muted-foreground max-w-[150px] truncate">
                {session.user.name || session.user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger button - 44px touch target */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex items-center justify-center h-11 w-11 rounded-lg hover:bg-muted transition-colors"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/98 backdrop-blur">
          <div className="container mx-auto px-4 py-4 space-y-3">
            <Link
              href="/leaderboard"
              className="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors min-h-[44px] flex items-center"
              onClick={() => setMobileOpen(false)}
            >
              Leaderboard
            </Link>
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors min-h-[44px] flex items-center"
                onClick={() => setMobileOpen(false)}
              >
                Admin
              </Link>
            )}
            {session?.user?.role === "CANDIDATE" && (
              <Link
                href="/dashboard"
                className="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors min-h-[44px] flex items-center"
                onClick={() => setMobileOpen(false)}
              >
                Dashboard
              </Link>
            )}

            <hr className="border-border/50 my-2" />

            {session?.user ? (
              <>
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {session.user.name || session.user.email}
                </div>
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    signOut({ callbackUrl: "/" })
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors min-h-[44px] flex items-center"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors min-h-[44px] flex items-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block px-3 py-2.5 text-sm rounded-lg hover:bg-muted transition-colors min-h-[44px] flex items-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
