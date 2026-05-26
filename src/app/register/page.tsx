"use client"

import { Suspense, useState, useEffect } from "react"
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

interface InviteValidity {
  valid: boolean
  error?: string
  expiresAt?: string
  usedCount?: number
  maxUses?: number
}

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCodeParam = searchParams.get("code") || ""

  const [step, setStep] = useState<"validating" | "form" | "error">(
    inviteCodeParam ? "validating" : "form"
  )
  const [inviteCode, setInviteCode] = useState(inviteCodeParam)
  const [inviteValid, setInviteValid] = useState<InviteValidity | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phone, setPhone] = useState("")
  const [college, setCollege] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Validate invite code when it changes
  useEffect(() => {
    if (!inviteCode) {
      setStep("form")
      setInviteValid(null)
      setInviteError(null)
      return
    }

    const validateInvite = async () => {
      setStep("validating")
      setInviteError(null)

      try {
        const res = await fetch(`/api/invite/${inviteCode}`)
        const data = await res.json()

        setInviteValid(data)

        if (data.valid) {
          setStep("form")
        } else {
          setInviteError(data.error || "Invalid invite code")
          setStep("error")
        }
      } catch {
        setInviteError("Failed to validate invite code")
        setStep("error")
      }
    }

    validateInvite()
  }, [inviteCode])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          name,
          email,
          password,
          phone: phone || undefined,
          college: college || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed")
        if (data.details) {
          const firstError = Object.values(data.details as Record<string, string[]>)[0]
          if (firstError) setError(firstError[0])
        }
        setLoading(false)
        return
      }

      // Auto-login after successful registration
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Fallback: redirect to login
        router.push("/login?registered=true")
        return
      }

      router.push("/assessment")
      router.refresh()
    } catch {
      setError("An unexpected error occurred")
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Enter your invite code and details to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invite Code */}
            <div className="space-y-2">
              <Label htmlFor="inviteCode">Invite Code</Label>
              <Input
                id="inviteCode"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              {inviteError && (
                <p className="text-xs text-red-500">{inviteError}</p>
              )}
              {inviteValid?.valid && inviteValid.maxUses && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  Valid invite — {inviteValid.maxUses - (inviteValid.usedCount || 0)} use(s) remaining
                </p>
              )}
              {step === "validating" && inviteCode && (
                <p className="text-xs text-muted-foreground">Validating invite code...</p>
              )}
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                At least 8 characters with 1 uppercase letter and 1 number
              </p>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* College */}
            <div className="space-y-2">
              <Label htmlFor="college">College / University (optional)</Label>
              <Input
                id="college"
                placeholder="MIT, Stanford, etc."
                value={college}
                onChange={(e) => setCollege(e.target.value)}
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
              disabled={loading || !inviteCode || !!inviteError}
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
