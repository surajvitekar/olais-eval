"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import LoadingSpinner from "@/components/shared/LoadingSpinner"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function InstructionsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    // Fetch the INSTRUCTIONS.md file
    fetch("/INSTRUCTIONS.md")
      .then((res) => res.text())
      .then((text) => {
        // Simple markdown to HTML conversion (basic)
        const html = simpleMarkdownToHtml(text)
        setContent(html)
      })
      .catch(() => {
        setContent("<p>Failed to load instructions.</p>")
      })
      .finally(() => setLoading(false))
  }, [status, router])

  if (status === "loading" || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>

      <Card>
        <CardContent className="py-8 px-6 md:px-10">
          <div
            className="prose prose-sm dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h1:text-3xl prose-h1:mb-4
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-code:text-sm prose-code:bg-muted prose-code:px-1 prose-code:rounded
              prose-pre:bg-muted prose-pre:border prose-pre:border-border
              prose-table:text-sm
              prose-th:bg-muted prose-th:px-3 prose-th:py-2
              prose-td:px-3 prose-td:py-2
              prose-strong:text-foreground
              prose-hr:border-border"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * Simple markdown to HTML converter for basic markdown.
 * This avoids needing a full markdown library.
 */
function simpleMarkdownToHtml(md: string): string {
  let html = md
    // Escape HTML entities
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  // Code blocks (```...```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langClass = lang ? ` class="language-${lang}"` : ""
    return `<pre><code${langClass}>${code.trim()}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>")

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" class="max-w-full rounded-lg" />')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Tables
  html = html.replace(/\n\|(.+)\|\n\|([-| ]+)\|\n((?:\|.+\|\n)*)/g, (_, header, separator, rows) => {
    const headers = header.split("|").map((h: string) => h.trim()).filter(Boolean)
    const rowData = rows.trim().split("\n").map((row: string) =>
      row.split("|").map((c: string) => c.trim()).filter(Boolean)
    )

    let table = '<div class="overflow-x-auto"><table class="w-full"><thead><tr>'
    headers.forEach((h: string) => {
      table += `<th>${h}</th>`
    })
    table += "</tr></thead><tbody>"
    rowData.forEach((row: string[]) => {
      table += "<tr>"
      row.forEach((cell: string) => {
        table += `<td>${cell}</td>`
      })
      table += "</tr>"
    })
    table += "</tbody></table></div>"
    return table
  })

  // Horizontal rules
  html = html.replace(/\n---+\n/g, "\n<hr />\n")

  // Headings (must be before bold/italic processing)
  html = html.replace(/^###### (.*$)/gm, "<h6>$1</h6>")
  html = html.replace(/^##### (.*$)/gm, "<h5>$1</h5>")
  html = html.replace(/^#### (.*$)/gm, "<h4>$1</h4>")
  html = html.replace(/^### (.*$)/gm, "<h3>$1</h3>")
  html = html.replace(/^## (.*$)/gm, "<h2>$1</h2>")
  html = html.replace(/^# (.*$)/gm, "<h1>$1</h1>")

  // Bold and italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>")

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>")
  html = html.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")

  // Paragraphs: wrap remaining lines not in HTML tags in <p>
  const lines = html.split("\n")
  let result = ""
  let inTag = false
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) {
      if (!inTag) result += "\n"
      continue
    }
    if (line.startsWith("<")) {
      inTag = !line.startsWith("</")
      result += line + "\n"
    } else if (line.startsWith("|")) {
      // Skip (already handled in table)
    } else {
      result += `<p>${line}</p>\n`
    }
  }

  return result.trim()
}
