"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import Link from "next/link"
import { CheckCircle } from "lucide-react"

export default function SubmittedPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Card className="text-center">
        <CardContent className="pt-12 pb-8">
          <div className="flex justify-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-3xl mb-2">Submission Complete!</CardTitle>
          <CardDescription className="text-lg mb-8">
            Your solution has been submitted successfully. Our team will review your
            submission and provide feedback.
          </CardDescription>

          <div className="space-y-4 text-left bg-muted/50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-sm">What happens next?</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li>1. Your submission enters the review queue</li>
              <li>2. Evaluators review your code, architecture, and AI usage</li>
              <li>3. You&apos;ll receive a detailed evaluation report</li>
              <li>4. Results are posted on the leaderboard</li>
            </ol>
          </div>

          <div className="text-sm text-muted-foreground mb-6">
            <p>In the meantime, make sure your git repo has:</p>
            <ul className="mt-2 space-y-1">
              <li>• A <code className="text-xs bg-muted px-1 rounded">prompts/</code> folder with ALL your prompts</li>
              <li>• A comprehensive <code className="text-xs bg-muted px-1 rounded">ARCHITECTURE.md</code></li>
              <li>• A working live deployment</li>
            </ul>
          </div>

          {status === "authenticated" && (
            <div className="flex justify-center gap-3">
              <Link href="/problems">
                <Button variant="outline">Back to Problems</Button>
              </Link>
              <Link href="/submissions">
                <Button>View Submissions</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
