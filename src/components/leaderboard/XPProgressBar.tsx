"use client"

interface XPProgressBarProps {
  current: number
  nextLevel: number
  percent: number
  color: string
}

const TIER_HEX_COLORS: Record<string, string> = {
  "bronze_iii": "#92400e",
  "bronze_ii": "#d97706",
  "bronze_i": "#f59e0b",
  "silver_ii": "#9ca3af",
  "silver_i": "#d1d5db",
  "gold_ii": "#facc15",
  "gold_i": "#fde047",
}

export default function XPProgressBar({ current, nextLevel, percent, color }: XPProgressBarProps) {
  const barColor = TIER_HEX_COLORS[color] || "#6b7280"

  return (
    <div className="mt-1.5 space-y-0.5">
      <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(100, percent)}%`, backgroundColor: barColor }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/60">
        {current.toLocaleString()} XP &middot; {nextLevel - current > 0 ? `${(nextLevel - current).toLocaleString()} XP to next level` : "Max level"}
      </p>
    </div>
  )
}
