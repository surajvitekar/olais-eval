"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import AIProblemGenerator from "@/components/admin/AIProblemGenerator"

export default function AdminGenerateProblemPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard")
      return
    }
  }, [status, session, router])

  if (status === "loading") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (session?.user?.role !== "ADMIN") {
    return null
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          AI Problem Generator
        </h1>
        <p className="mt-1 text-muted-foreground">
          Generate structured assessment problems using AI or templates.
          Describe what you need, and the system will create a complete problem
          with requirements, constraints, deliverables, and evaluation criteria.
        </p>
      </div>

      <AIProblemGenerator />
    </div>
  )
}
