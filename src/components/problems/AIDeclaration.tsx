"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const TOOL_OPTIONS = [
  "Cursor",
  "Copilot",
  "Claude",
  "ChatGPT",
  "Windsurf",
  "Cline",
  "Other",
]

interface AIDeclarationProps {
  selectedTools: string[]
  onToolsChange: (tools: string[]) => void
  helpDescription: string
  onHelpDescriptionChange: (value: string) => void
  manualWork: string
  onManualWorkChange: (value: string) => void
  reasoning: string
  onReasoningChange: (value: string) => void
  prompts: string
  onPromptsChange: (value: string) => void
  errors: Record<string, string>
}

export default function AIDeclaration({
  selectedTools,
  onToolsChange,
  helpDescription,
  onHelpDescriptionChange,
  manualWork,
  onManualWorkChange,
  reasoning,
  onReasoningChange,
  prompts,
  onPromptsChange,
  errors,
}: AIDeclarationProps) {
  function toggleTool(tool: string) {
    if (selectedTools.includes(tool)) {
      onToolsChange(selectedTools.filter((t) => t !== tool))
    } else {
      onToolsChange([...selectedTools, tool])
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Tools Multi-Select */}
      <div className="space-y-2">
        <Label>
          Which AI tools did you use? <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {TOOL_OPTIONS.map((tool) => (
            <button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedTools.includes(tool)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
        {errors.aiTools && (
          <p className="text-xs text-destructive">{errors.aiTools}</p>
        )}
      </div>

      {/* What AI helped with */}
      <div className="space-y-2">
        <Label htmlFor="aiHelp">
          What did AI help you with? <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="aiHelp"
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g., Wrote the initial scaffolding, helped debug API routes, generated CSS..."
          value={helpDescription}
          onChange={(e) => onHelpDescriptionChange(e.target.value)}
        />
        {errors.aiHelpDescription && (
          <p className="text-xs text-destructive">{errors.aiHelpDescription}</p>
        )}
      </div>

      {/* What was manual */}
      <div className="space-y-2">
        <Label htmlFor="aiManual">
          What did you write or do manually? <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="aiManual"
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g., Architecture decisions, database schema, performance tuning..."
          value={manualWork}
          onChange={(e) => onManualWorkChange(e.target.value)}
        />
        {errors.aiManualWork && (
          <p className="text-xs text-destructive">{errors.aiManualWork}</p>
        )}
      </div>

      {/* Reasoning */}
      <div className="space-y-2">
        <Label htmlFor="aiReasoning">Why did you choose these AI tools?</Label>
        <textarea
          id="aiReasoning"
          rows={2}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="e.g., Claude was better for reasoning, Copilot for autocomplete..."
          value={reasoning}
          onChange={(e) => onReasoningChange(e.target.value)}
        />
      </div>

      {/* Prompts */}
      <div className="space-y-2">
        <Label htmlFor="aiPrompts">
          What prompts did you use? <span className="text-destructive">*</span>
        </Label>
        <textarea
          id="aiPrompts"
          rows={3}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="List key prompts or link to your prompts/ folder in the git repo. We want to see how you collaborated with AI."
          value={prompts}
          onChange={(e) => onPromptsChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Include a <code className="text-xs">prompts/</code> folder in your git repo with ALL prompts you used — the ones that worked AND the ones that didn&apos;t.
        </p>
      </div>
    </div>
  )
}
