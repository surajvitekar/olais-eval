"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import Link from "next/link"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"
  const registered = searchParams.get("registered")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Read brand CSS variables from the document
  const brandPrimary =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--brand-primary").trim() || "#10b981"
      : "#10b981"
  const brandLogoUrl =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--brand-logo-url").trim() || ""
      : ""
  const brandLoginBg =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--brand-login-bg").trim() || ""
      : ""
  const brandCompanyName =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--brand-company-name").trim() || "Olais Eval"
      : "Olais Eval"
  const brandAccent =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--brand-accent").trim() || "#6366f1"
      : "#6366f1"

  // Get the logo URL from CSS --brand-logo-url (which has url(...) wrapping)
  const logoUrl = brandLogoUrl
    ? brandLogoUrl.replace(/^url\(["']?|["']?\)$/g, "")
    : null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Invalid email or password")
        setLoading(false)
        return
      }

      // Successful login - get session to check role for redirect
      router.push(callbackUrl)
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  // Compute background style
  const bgStyle: React.CSSProperties = {}
  if (brandLoginBg) {
    if (brandLoginBg.startsWith("http") || brandLoginBg.startsWith("url(")) {
      bgStyle.backgroundImage = brandLoginBg.startsWith("url(")
        ? brandLoginBg
        : `url(${brandLoginBg})`
      bgStyle.backgroundSize = "cover"
      bgStyle.backgroundPosition = "center"
    } else {
      bgStyle.background = brandLoginBg
    }
  }

  return (
    <div
      className="flex min-h-[80vh] items-center justify-center px-4"
      style={bgStyle}
    >
      <Card
        className="w-full max-w-md"
        style={{
          ...(brandLoginBg
            ? { backdropFilter: "blur(8px)", backgroundColor: "rgba(0,0,0,0.6)" }
            : {}),
        }}
      >
        <CardHeader className="text-center">
          {logoUrl ? (
            <div className="flex justify-center mb-3">
              <img
                src={logoUrl}
                alt="Brand Logo"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none"
                }}
              />
            </div>
          ) : null}
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your{" "}
            <span style={{ color: brandPrimary }}>
              {brandCompanyName}
            </span>{" "}
            account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registered && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              Account created successfully! Please sign in.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              style={{
                backgroundColor: brandPrimary,
                borderColor: brandPrimary,
              }}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium hover:underline"
              style={{ color: brandPrimary }}
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
