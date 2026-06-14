"use client"

interface BadgeDisplayProps {
  badges: Array<{ slug: string; name: string; emoji: string }>
}

export default function BadgeDisplay({ badges }: BadgeDisplayProps) {
  if (!badges || badges.length === 0) return null

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {badges.map((badge) => (
        <span
          key={badge.slug}
          className="inline-flex items-center justify-center h-5 w-5 text-xs cursor-help"
          title={badge.name}
        >
          {badge.emoji}
        </span>
      ))}
    </div>
  )
}
