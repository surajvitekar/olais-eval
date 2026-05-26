import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export default function PageContainer({ children, className }: PageContainerProps) {
  return (
    <main className={cn("container mx-auto max-w-7xl flex-1 px-4 py-8", className)}>
      {children}
    </main>
  )
}
