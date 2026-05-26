export default function Footer() {
  return (
    <footer className="border-t border-border bg-background/95 mt-auto">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Olais.in — Candidate Evaluation Portal
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://olais.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              olais.in
            </a>
            <span className="text-sm text-muted-foreground">|</span>
            <span className="text-sm text-muted-foreground">
              Built with Next.js &middot; Prisma &middot; PostgreSQL
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
