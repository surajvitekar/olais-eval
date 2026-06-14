"use client"

import { ArrowUp, ArrowDown, Minus, Plus } from "lucide-react"

interface PositionChangeProps {
  type: "up" | "down" | "same" | "new"
  amount: number
}

export default function PositionChange({ type, amount }: PositionChangeProps) {
  if (type === "same") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground/40" title="No change">
        <Minus className="h-3 w-3" />
      </span>
    )
  }

  if (type === "new") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-blue-400 animate-pulse" title="New entry">
        <Plus className="h-3 w-3" />
        new
      </span>
    )
  }

  if (type === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-400 font-medium" title={`Moved up ${amount} place${amount > 1 ? "s" : ""}`}>
        <ArrowUp className="h-3 w-3" />
        {amount}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-400 font-medium" title={`Moved down ${amount} place${amount > 1 ? "s" : ""}`}>
      <ArrowDown className="h-3 w-3" />
      {amount}
    </span>
  )
}
