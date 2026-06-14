import { getActiveBrand } from "@/lib/branding/config"

/**
 * Renders a <style> tag with brand CSS variables from the active brand config.
 * This is a server component that fetches the brand config directly from the DB.
 */
export default async function BrandStyles() {
  const brand = await getActiveBrand()

  if (!brand || !brand.isActive) {
    return null
  }

  const vars: string[] = []

  if (brand.primaryColor) {
    vars.push(`--brand-primary: ${brand.primaryColor}`)
  }

  if (brand.secondaryColor) {
    vars.push(`--brand-secondary: ${brand.secondaryColor}`)
  }

  if (brand.accentColor) {
    vars.push(`--brand-accent: ${brand.accentColor}`)
  }

  if (brand.companyName) {
    vars.push(`--brand-company-name: "${brand.companyName}"`)
  }

  if (brand.logoUrl) {
    vars.push(`--brand-logo-url: url(${brand.logoUrl})`)
  }

  if (brand.loginBackground) {
    vars.push(`--brand-login-bg: ${brand.loginBackground}`)
  }

  const cssVars = vars.join("; ")

  if (!cssVars) {
    return null
  }

  return (
    <>
      <style id="brand-styles" dangerouslySetInnerHTML={{
        __html: `:root { ${cssVars} }`,
      }} />
      {brand.faviconUrl && (
        <link rel="icon" href={brand.faviconUrl} sizes="any" />
      )}
    </>
  )
}
