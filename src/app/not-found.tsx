import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Terminal, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <Terminal className="h-6 w-6 text-amber-400" />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          <span className="text-amber-400">404</span> — Not Found
        </h1>

        <div className="mb-6 text-sm font-mono text-muted-foreground bg-card/50 rounded-lg p-3 border border-border/50">
          <span className="text-amber-400/60">$ </span>
          <span className="text-muted-foreground">ls /path/that/does/not/exist</span>
          <br />
          <span className="text-red-400/60">ls: cannot access &apos;/path/that/does/not/exist&apos;: No such file or directory</span>
        </div>

        <p className="text-muted-foreground mb-8">
          The page you&apos;re looking for doesn&apos;t exist. It may have been moved or the URL is incorrect.
        </p>

        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
}
