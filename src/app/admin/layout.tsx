"use client"

import { useSession } from "next-auth/react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { isAdminRole } from "@/lib/auth/permissions"
import type { UserRole } from "@/types"
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardCheck,
  Trophy,
  Settings,
  ChevronLeft,
  Menu,
  LogOut,
  Mail,
  Download,
  Webhook,
  BarChart3,
  FileSpreadsheet,
  ShieldAlert,
  ClipboardList,
  Palette,
  Shield,
  Calendar,
  Database,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"

const sidebarLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/candidates", label: "Candidates", icon: Users },
  { href: "/admin/invites", label: "Invites", icon: Mail },
  { href: "/admin/interviews", label: "Interviews", icon: Calendar },
  { href: "/admin/submissions", label: "Submissions", icon: FileText },
  { href: "/admin/evaluations", label: "Evaluations", icon: ClipboardList },
  { href: "/admin/problems", label: "Problem Bank", icon: ClipboardCheck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/exports", label: "Exports", icon: Download },
  { href: "/admin/backups", label: "Backups", icon: Database },
  { href: "/admin/email-templates", label: "Email Templates", icon: FileSpreadsheet },
  { href: "/admin/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/admin/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/admin/plagiarism", label: "Plagiarism", icon: ShieldAlert },
  { href: "/admin/monitoring", label: "Monitoring", icon: Activity },
  { href: "/admin/security", label: "Security", icon: Shield },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/branding", label: "Branding", icon: Palette },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && !isAdminRole(session?.user?.role as UserRole)) {
      router.push("/dashboard")
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!session?.user?.role || !isAdminRole(session.user.role as UserRole)) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex flex-col border-r border-border bg-card transition-all duration-200 ${
          sidebarOpen ? "w-60" : "w-16"
        }`}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {sidebarOpen && (
            <Link
              href="/admin"
              className="text-lg font-bold tracking-tight truncate"
            >
              olais<span className="text-primary">.admin</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="shrink-0"
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href + "/"))

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{link.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-border p-3">
          {sidebarOpen && (
            <div className="mb-2 px-3 py-1.5 text-xs text-muted-foreground truncate">
              {session.user?.name || session.user?.email}
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start gap-3 text-muted-foreground ${
              !sidebarOpen && "justify-center px-0"
            }`}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-200 ${
          sidebarOpen ? "ml-60" : "ml-16"
        }`}
      >
        <div className="container mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
