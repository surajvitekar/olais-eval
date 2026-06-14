import { prisma } from "@/lib/prisma"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BrandConfigData {
  id: string
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
  createdAt: Date
  updatedAt: Date
}

export interface BrandConfigInput {
  companyName?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  customDomain?: string
  emailFromName?: string
  emailFromAddress?: string
  loginBackground?: string
  isActive?: boolean
}

const DEFAULT_BRAND: BrandConfigData = {
  id: "default",
  companyName: "Olais",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#10b981",
  secondaryColor: "#1f2937",
  accentColor: "#6366f1",
  customDomain: null,
  emailFromName: "Olais Team",
  emailFromAddress: "eval@olais.in",
  loginBackground: null,
  isActive: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}

// ─── Brand Config Service ────────────────────────────────────────────────────

/**
 * Get the active brand configuration from the database.
 * Returns null if no active brand config exists.
 */
export async function getActiveBrand(): Promise<BrandConfigData | null> {
  try {
    const brand = await prisma.brandConfig.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    })

    if (!brand) return null

    return brand as BrandConfigData
  } catch (error) {
    console.error("Error fetching active brand config:", error)
    return null
  }
}

/**
 * Get the active brand configuration, falling back to defaults.
 */
export async function getActiveBrandOrDefault(): Promise<BrandConfigData> {
  const active = await getActiveBrand()
  if (!active) return DEFAULT_BRAND
  return active
}

/**
 * Generate CSS variable declarations from a brand config.
 * These can be injected into the <head> or into a style tag.
 *
 * Variables mapped:
 *   --brand-primary     → primaryColor
 *   --brand-secondary   → secondaryColor
 *   --brand-accent      → accentColor
 *   --brand-logo-url    → logoUrl (as CSS url())
 *   --brand-login-bg    → loginBackground
 */
export function getBrandCssVars(brand: BrandConfigData | null): string {
  if (!brand || !brand.isActive) return ""

  const vars: string[] = []

  if (brand.primaryColor) {
    vars.push(`--brand-primary: ${brand.primaryColor}`)
    // Also set CSS color scheme variables — primary maps to Tailwind bg-primary etc.
    vars.push(`--brand-primary-h: 0`)
    vars.push(`--brand-primary-s: 0%`)
    vars.push(`--brand-primary-l: 0%`)
  }

  if (brand.secondaryColor) {
    vars.push(`--brand-secondary: ${brand.secondaryColor}`)
  }

  if (brand.accentColor) {
    vars.push(`--brand-accent: ${brand.accentColor}`)
  }

  if (brand.logoUrl) {
    vars.push(`--brand-logo-url: url(${brand.logoUrl})`)
  }

  if (brand.loginBackground) {
    vars.push(`--brand-login-bg: ${brand.loginBackground}`)
  }

  return vars.join("; ")
}

/**
 * Get brand-specific CSS variable declarations as a React CSSProperties object
 * for use with inline styles on the root element.
 */
export function getBrandCssVarsObject(brand: BrandConfigData | null): Record<string, string> {
  if (!brand || !brand.isActive) return {}

  const vars: Record<string, string> = {}

  if (brand.primaryColor) {
    vars["--brand-primary"] = brand.primaryColor
    vars["--brand-primary-h"] = "0"
    vars["--brand-primary-s"] = "0%"
    vars["--brand-primary-l"] = "0%"
  }

  if (brand.secondaryColor) {
    vars["--brand-secondary"] = brand.secondaryColor
  }

  if (brand.accentColor) {
    vars["--brand-accent"] = brand.accentColor
  }

  if (brand.logoUrl) {
    vars["--brand-logo-url"] = `url(${brand.logoUrl})`
  }

  if (brand.loginBackground) {
    vars["--brand-login-bg"] = brand.loginBackground
  }

  return vars
}

/**
 * Get the brand's company name or the default "Olais Eval".
 */
export function getBrandCompanyName(brand: BrandConfigData | null): string {
  return brand?.companyName || "Olais Eval"
}

/**
 * Get brand logo URL or null.
 */
export function getBrandLogoUrl(brand: BrandConfigData | null): string | null {
  return brand?.logoUrl || null
}

export { DEFAULT_BRAND }
