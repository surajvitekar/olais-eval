"use client"

interface LevelBadgeProps {
  level: number
  name: string
  emoji: string
  color: string
}

const TIER_COLORS: Record<string, string> = {
  "bronze_iii": "#92400e",
  "bronze_ii": "#d97706",
  "bronze_i": "#f59e0b",
  "silver_ii": "#9ca3af",
  "silver_i": "#d1d5db",
  "gold_ii": "#facc15",
  "gold_i": "#fde047",
}

export default function LevelBadge({ level, name, emoji, color }: LevelBadgeProps) {
  const bgColor = TIER_COLORS[color] || "#6b7280"

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full border"
      style={{ backgroundColor: `${bgColor}15`, borderColor: `${bgColor}30`, color: bgColor }}
      title={`Level ${level}: ${name}`}
    >
      <span className="text-sm leading-none">{emoji}</span>
      <span className="hidden sm:inline">{name}</span>
    </span>
  )
}
