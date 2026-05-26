"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import AIDeclaration from "@/components/problems/AIDeclaration"

interface SubmissionFormProps {
  assignedProblemId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function SubmissionForm({
  assignedProblemId,
  onSuccess,
  onCancel,
}: SubmissionFormProps) {
  const [gitUrl, setGitUrl] = useState("")
  const [liveUrl, setLiveUrl] = useState("")
  const [architectureNotes, setArchitectureNotes] = useState("")
  const [aiTools, setAiTools] = useState<string[]>([])
  const [aiHelpDescription, setAiHelpDescription] = useState("")
  const [aiManualWork, setAiManualWork] = useState("")
  const [aiReasoning, setAiReasoning] = useState("")
  const [aiPrompts, setAiPrompts] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    if (!gitUrl.trim()) {
      newErrors.gitUrl = "Git repository URL is required"
    } else if (!gitUrl.startsWith("http") && !gitUrl.startsWith("git@")) {
      newErrors.gitUrl = "Enter a valid git URL (https:// or git@)"
    }

    if (liveUrl.trim() && !liveUrl.startsWith("http")) {
      newErrors.liveUrl = "Enter a valid URL starting with http"
    }

    if (!architectureNotes.trim()) {
      newErrors.architectureNotes = "Architecture notes are required"
    }

    if (aiTools.length === 0) {
      newErrors.aiTools = "Select at least one AI tool you used"
    }

    if (!aiHelpDescription.trim()) {
      newErrors.aiHelpDescription = "Describe what AI helped with"
    }

    if (!aiManualWork.trim()) {
      newErrors.aiManualWork = "Describe what you did manually"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const res = await fetch("/api/candidate/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignedProblemId,
          gitUrl: gitUrl.trim(),
          liveUrl: liveUrl.trim() || null,
          architectureNotes: architectureNotes.trim(),
          aiUsageExplanation: JSON.stringify({
            tools: aiTools,
            helpDescription: aiHelpDescription.trim(),
            manualWork: aiManualWork.trim(),
            reasoning: aiReasoning.trim(),
            prompts: aiPrompts.trim(),
          }),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit")
      }

      onSuccess()
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Submission failed" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Git URL */}
      <div className="space-y-2">
        <Label htmlFor="gitUrl">
          Git Repository URL <span className="text-destructive">*</span>
        </Label>
        <Input
          id="gitUrl"
          placeholder="https://github.com/username/repo"
          value={gitUrl}
          onChange={(e) => setGitUrl(e.target.value)}
        />
        {errors.gitUrl && (
          <p className="text-xs text-destructive">{errors.gitUrl}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Public GitHub/GitLab repository with your solution
        </p>
      </div>

      {/* Live URL */}
      <div className="space-y-2">
        <Label htmlFor="liveUrl">Live Deployment URL</Label>
        <Input
          id="liveUrl"
          placeholder="https://your-app.vercel.app"
          value={liveUrl}
          onChange={(e) => setLiveUrl(e.target.value)}
        />
        {errors.liveUrl && (
          <p className="text-xs text-destructive">{errors.liveUrl}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Deploy anywhere free (Vercel, Railway, Render, Netlify, etc.)
        </p>
      </div>

      {/* Architecture Notes */}
      <div className="space-y-2">
        <Label htmlFor="archNotes">
          Architecture Notes <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="archNotes"
          rows={5}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Explain your architecture, tech choices, and key decisions..."
          value={architectureNotes}
          onChange={(e) => setArchitectureNotes(e.target.value)}
        />
        {errors.architectureNotes && (
          <p className="text-xs text-destructive">{errors.architectureNotes}</p>
        )}
      </div>

      {/* AI Declaration */}
      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <h3 className="font-semibold">AI Usage Declaration</h3>
          <p className="text-sm text-muted-foreground">
            Tell us how you used AI in this project. Include a <code>prompts/</code> folder in your git repo with ALL prompts you used.
          </p>
        </div>

        <AIDeclaration
          selectedTools={aiTools}
          onToolsChange={setAiTools}
          helpDescription={aiHelpDescription}
          onHelpDescriptionChange={setAiHelpDescription}
          manualWork={aiManualWork}
          onManualWorkChange={setAiManualWork}
          reasoning={aiReasoning}
          onReasoningChange={setAiReasoning}
          prompts={aiPrompts}
          onPromptsChange={setAiPrompts}
          errors={errors}
        />
      </div>

      {/* Submit Error */}
      {errors.submit && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Solution"}
        </Button>
      </div>
    </form>
  )
}
