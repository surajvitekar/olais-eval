"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

interface ProblemSelectorTab {
  id: string
  title: string
  status: string
}

interface ProblemSelectorProps {
  problems: ProblemSelectorTab[]
  activeId: string
  onSelect: (id: string) => void
}

export default function ProblemSelector({
  problems,
  activeId,
  onSelect,
}: ProblemSelectorProps) {
  if (problems.length === 0) return null

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1" role="tablist">
      {problems.map((problem) => (
        <button
          key={problem.id}
          role="tab"
          type="button"
          onClick={() => onSelect(problem.id)}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeId === problem.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="block truncate">{problem.title}</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {problem.status.replace("_", " ")}
          </span>
        </button>
      ))}
    </div>
  )
}
