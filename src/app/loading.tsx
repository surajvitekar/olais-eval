export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        {/* Terminal-style loading animation */}
        <div className="mb-4 flex items-center gap-2 text-sm font-mono text-muted-foreground">
          <span className="text-emerald-400">$</span>
          <span className="animate-pulse">loading...</span>
          <span className="inline-block h-4 w-2 bg-emerald-400/60 animate-[blink_1s_step-end_infinite]" />
        </div>

        {/* Spinner */}
        <div className="flex items-center justify-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-emerald-400/40 animate-pulse"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground">Preparing your workspace...</p>
      </div>
    </div>
  )
}
