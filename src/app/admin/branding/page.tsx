"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import LoadingSpinner from "@/components/shared/LoadingSpinner"

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrandConfig {
  id?: string
  companyName: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  secondaryColor: string
  accentColor: string
  customDomain: string | null
  emailFromName: string | null
  emailFromAddress: string | null
  loginBackground: string | null
  isActive: boolean
}

const DEFAULT_BRAND: BrandConfig = {
  companyName: "",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#10b981",
  secondaryColor: "#1f2937",
  accentColor: "#6366f1",
  customDomain: "",
  emailFromName: "",
  emailFromAddress: "",
  loginBackground: "",
  isActive: true,
}

// ─── Color Picker Input ──────────────────────────────────────────────────────

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
          />
        </div>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#hex"
          className="font-mono text-sm flex-1"
        />
      </div>
    </div>
  )
}

// ─── Live Preview Panel ──────────────────────────────────────────────────────

function LivePreview({ brand }: { brand: BrandConfig }) {
  const cardPreviewStyles: React.CSSProperties = {}
  if (brand.primaryColor) {
    cardPreviewStyles.boxShadow = `0 0 20px ${brand.primaryColor}22, 0 0 40px ${brand.primaryColor}11`
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Preview
        </CardTitle>
        <CardDescription>How your brand will appear to candidates</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Navbar Preview */}
        <div
          className="rounded-lg border border-border/50 overflow-hidden"
          style={{ borderColor: `${brand.primaryColor}44` }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b border-border/30"
            style={{ backgroundColor: `${brand.secondaryColor}`, borderColor: `${brand.primaryColor}22` }}
          >
            <div className="flex items-center gap-2">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt="Logo"
                  className="h-6 w-auto max-w-[100px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : (
                <span className="text-sm font-bold" style={{ color: brand.primaryColor }}>
                  {brand.companyName || "Your Brand"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: `${brand.primaryColor}22`,
                  color: brand.primaryColor,
                }}
              >
                Leaderboard
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: `${brand.primaryColor}44`,
                  color: brand.primaryColor,
                }}
              >
                Login
              </span>
            </div>
          </div>

          {/* Page Content Preview */}
          <div className="p-4 space-y-3" style={{ backgroundColor: "var(--background)" }}>
            <div
              className="h-2 w-3/4 rounded-full opacity-20"
              style={{ backgroundColor: brand.primaryColor }}
            />
            <div
              className="h-2 w-1/2 rounded-full opacity-15"
              style={{ backgroundColor: brand.primaryColor }}
            />
            <div
              className="h-2 w-5/6 rounded-full opacity-10"
              style={{ backgroundColor: brand.primaryColor }}
            />
            <div
              className="mt-4 rounded-lg p-3"
              style={{
                backgroundColor: `${brand.primaryColor}11`,
                borderLeft: `3px solid ${brand.primaryColor}`,
              }}
            >
              <p className="text-xs font-medium mb-1" style={{ color: brand.primaryColor }}>
                Candidate Assessment
              </p>
              <p className="text-xs text-muted-foreground">
                This is how your branded content will look.
              </p>
            </div>
          </div>
        </div>

        {/* Login Card Preview */}
        <div
          className="rounded-lg border border-border/30 overflow-hidden"
          style={{
            backgroundColor: brand.loginBackground ? `${brand.loginBackground}dd` : undefined,
            backgroundImage: brand.loginBackground?.startsWith("url(") || brand.loginBackground?.startsWith("http")
              ? `url(${brand.loginBackground})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="backdrop-blur-sm bg-card/80 p-4">
            <div className="text-center mb-3">
              {brand.logoUrl ? (
                <img
                  src={brand.logoUrl}
                  alt="Logo"
                  className="h-8 mx-auto mb-2 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none"
                  }}
                />
              ) : (
                <div
                  className="text-lg font-bold mb-1"
                  style={{ color: brand.primaryColor }}
                >
                  {brand.companyName || "Your Brand"}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Sign in to your account
              </p>
            </div>
            <div className="space-y-2">
              <div className="h-7 rounded-md opacity-20" style={{ backgroundColor: brand.primaryColor }} />
              <div className="h-7 rounded-md opacity-20" style={{ backgroundColor: brand.primaryColor }} />
              <div
                className="h-7 rounded-md flex items-center justify-center text-xs font-medium text-white"
                style={{ backgroundColor: brand.primaryColor }}
              >
                Sign In
              </div>
            </div>
            <p className="text-xs text-center mt-2 text-muted-foreground">
              <span style={{ color: brand.primaryColor }}>{brand.emailFromName || "Team"}</span> |{" "}
              {brand.emailFromAddress || "email@example.com"}
            </p>
          </div>
        </div>

        {/* Color Swatches */}
        <div className="flex gap-2">
          {[
            { label: "Primary", color: brand.primaryColor },
            { label: "Secondary", color: brand.secondaryColor },
            { label: "Accent", color: brand.accentColor },
          ].map((swatch) => (
            <div key={swatch.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className="h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: swatch.color }}
              />
              {swatch.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Admin Branding Page ─────────────────────────────────────────────────────

export default function AdminBrandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [brand, setBrand] = useState<BrandConfig>(DEFAULT_BRAND)
  const [existingId, setExistingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
    if (status === "authenticated") {
      fetchBrandConfig()
    }
  }, [status, session, router])

  async function fetchBrandConfig() {
    try {
      const res = await fetch("/api/admin/branding")
      if (res.ok) {
        const data = await res.json()
        if (data.brand) {
          setBrand({
            id: data.brand.id,
            companyName: data.brand.companyName ?? "",
            logoUrl: data.brand.logoUrl ?? "",
            faviconUrl: data.brand.faviconUrl ?? "",
            primaryColor: data.brand.primaryColor ?? "#10b981",
            secondaryColor: data.brand.secondaryColor ?? "#1f2937",
            accentColor: data.brand.accentColor ?? "#6366f1",
            customDomain: data.brand.customDomain ?? "",
            emailFromName: data.brand.emailFromName ?? "",
            emailFromAddress: data.brand.emailFromAddress ?? "",
            loginBackground: data.brand.loginBackground ?? "",
            isActive: data.brand.isActive ?? false,
          })
          setExistingId(data.brand.id)
        }
      }
    } catch (err) {
      console.error("Failed to fetch brand config", err)
    } finally {
      setLoading(false)
    }
  }

  const updateField = useCallback(<K extends keyof BrandConfig>(
    key: K,
    value: BrandConfig[K]
  ) => {
    setBrand((prev) => ({ ...prev, [key]: value }))
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        ...(existingId ? { id: existingId } : {}),
        companyName: brand.companyName || null,
        logoUrl: brand.logoUrl || null,
        faviconUrl: brand.faviconUrl || null,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        accentColor: brand.accentColor,
        customDomain: brand.customDomain || null,
        emailFromName: brand.emailFromName || null,
        emailFromAddress: brand.emailFromAddress || null,
        loginBackground: brand.loginBackground || null,
        isActive: brand.isActive,
      }

      const method = existingId ? "PUT" : "POST"
      const res = await fetch("/api/admin/branding", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save brand config")
      }

      const data = await res.json()
      if (data.brand?.id && !existingId) {
        setExistingId(data.brand.id)
      }

      toast.success("Brand configuration saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save brand config")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <LoadingSpinner text="Loading brand settings..." />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">White-Label Branding</h1>
        <p className="mt-1 text-muted-foreground">
          Customize the look and feel of Olais Eval for your organization
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ─── Form Panel ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* General */}
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Company name and logos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Olais"
                  value={brand.companyName ?? ""}
                  onChange={(e) => updateField("companyName", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Shown in the navbar, login page, and email templates
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  placeholder="https://example.com/logo.png"
                  value={brand.logoUrl ?? ""}
                  onChange={(e) => updateField("logoUrl", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL to your logo image (PNG or SVG recommended, max 200px height)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  placeholder="https://example.com/favicon.ico"
                  value={brand.faviconUrl ?? ""}
                  onChange={(e) => updateField("faviconUrl", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  URL to favicon (.ico or .png, 32x32 or 16x16)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Colors</CardTitle>
              <CardDescription>
                Brand color palette used throughout the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ColorInput
                  label="Primary Color"
                  value={brand.primaryColor}
                  onChange={(v) => updateField("primaryColor", v)}
                />
                <ColorInput
                  label="Secondary Color"
                  value={brand.secondaryColor}
                  onChange={(v) => updateField("secondaryColor", v)}
                />
                <ColorInput
                  label="Accent Color"
                  value={brand.accentColor}
                  onChange={(v) => updateField("accentColor", v)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Primary is used for buttons and links. Secondary for navbars and headers. Accent for highlights.
              </p>
            </CardContent>
          </Card>

          {/* Custom Domain & Email */}
          <Card>
            <CardHeader>
              <CardTitle>Domain &amp; Email</CardTitle>
              <CardDescription>Custom domain and email sender settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customDomain">Custom Domain</Label>
                <Input
                  id="customDomain"
                  placeholder="eval.yourcompany.com"
                  value={brand.customDomain ?? ""}
                  onChange={(e) => updateField("customDomain", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Custom domain for your evaluation portal (DNS setup required separately)
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="emailFromName">Email From Name</Label>
                <Input
                  id="emailFromName"
                  placeholder="Acme Hiring Team"
                  value={brand.emailFromName ?? ""}
                  onChange={(e) => updateField("emailFromName", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailFromAddress">Email From Address</Label>
                <Input
                  id="emailFromAddress"
                  type="email"
                  placeholder="hiring@yourcompany.com"
                  value={brand.emailFromAddress ?? ""}
                  onChange={(e) => updateField("emailFromAddress", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Used as the sender address for all candidate emails
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Login Page */}
          <Card>
            <CardHeader>
              <CardTitle>Login Page</CardTitle>
              <CardDescription>
                Customize the login page background
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loginBackground">Login Background</Label>
                <Input
                  id="loginBackground"
                  placeholder="https://example.com/bg.jpg or #color or gradient(...)"
                  value={brand.loginBackground ?? ""}
                  onChange={(e) => updateField("loginBackground", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  CSS background value — a color, gradient, or image URL
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Activation */}
          <Card>
            <CardHeader>
              <CardTitle>Activation</CardTitle>
              <CardDescription>
                Enable or disable white-label branding
              </CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={brand.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-emerald-500"
                />
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-xs text-muted-foreground">
                    When active, all pages will use these brand settings
                  </p>
                </div>
              </label>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? "Saving..." : existingId ? "Update Branding" : "Save Branding"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* ─── Live Preview Panel ─────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <LivePreview brand={brand} />
        </div>
      </div>
    </div>
  )
}
