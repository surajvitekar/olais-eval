"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Terminal, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-red-500/10 border border-red-500/20 mb-6">
          <Terminal className="h-6 w-6 text-red-400" />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          <span className="text-red-400">Error</span> encountered
        </h1>

        <div className="mb-6 text-sm font-mono text-muted-foreground bg-card/50 rounded-lg p-3 border border-border/50">
          <span className="text-red-400/60">$ </span>
          <span className="text-muted-foreground">exit_code: 1 — </span>
          <span className="text-foreground/60">{error.message || "An unexpected error occurred"}</span>
        </div>

        <p className="text-muted-foreground mb-8">
          Something went wrong. This has been logged and we&apos;ll look into it.
          Try refreshing the page.
        </p>

        <Button
          onClick={reset}
          className="gap-2 bg-red-600 hover:bg-red-500 text-white"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  )
}
