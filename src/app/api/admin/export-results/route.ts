import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import PDFDocument from "pdfkit"
import { PassThrough } from "stream"

// ─── Dimension Labels ────────────────────────────────────────────────────────

const DIMENSION_LABELS: Record<string, string> = {
  executionScore: "Execution & Functionality",
  architectureScore: "Architecture & Design",
  thoughtProcessScore: "Thought Process & Problem Solving",
  aiUsageScore: "AI Usage & Tooling",
  deploymentScore: "Deployment & DevOps",
  codeOrganizationScore: "Code Organization & Quality",
  uiUxScore: "UI/UX & Design",
  communicationScore: "Communication & Documentation",
}

const DIMENSION_KEYS = [
  "executionScore",
  "architectureScore",
  "thoughtProcessScore",
  "aiUsageScore",
  "deploymentScore",
  "codeOrganizationScore",
  "uiUxScore",
  "communicationScore",
] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function escapeCsv(val: unknown): string {
  const str = String(val ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// ─── PDF Generation ──────────────────────────────────────────────────────────

async function generateSinglePdf(evaluationId: string): Promise<Buffer> {
  const evaluation = await prisma.evaluation.findUnique({
    where: { id: evaluationId },
    include: {
      submission: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedProblem: {
            include: {
              template: {
                select: {
                  title: true,
                  slug: true,
                  category: true,
                  difficulty: true,
                  overview: true,
                  requirements: true,
                },
              },
            },
          },
        },
      },
      evaluator: { select: { id: true, name: true, email: true } },
    },
  })

  if (!evaluation) {
    throw new Error("Evaluation not found")
  }

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 55, right: 55 },
    info: {
      Title: `Evaluation Report - ${evaluation.submission.user.name || evaluation.submission.user.email}`,
      Author: "Olais Eval",
      Subject: "Candidate Evaluation Score Card",
    },
  })

  const buffers: Buffer[] = []
  const stream = new PassThrough()
  stream.on("data", (chunk: Buffer) => buffers.push(chunk))
  doc.pipe(stream)

  // ── Colors & Styles ──
  const COLORS = {
    primary: [41, 98, 255] as [number, number, number],     // #2962FF
    secondary: [100, 116, 139] as [number, number, number],  // #64748B
    accent: [34, 197, 94] as [number, number, number],       // #22C55E
    border: [226, 232, 240] as [number, number, number],     // #E2E8F0
    bg: [248, 250, 252] as [number, number, number],        // #F8FAFC
    danger: [239, 68, 68] as [number, number, number],       // #EF4444
    warning: [245, 158, 11] as [number, number, number],    // #F59E0B
  }

  function rgb(c: [number, number, number]) {
    return `rgb(${c[0]},${c[1]},${c[2]})`
  }

  // ── Header ──
  doc
    .rect(0, 0, doc.page.width, 120)
    .fill(rgb(COLORS.primary))

  doc
    .fill("#FFFFFF")
    .fontSize(26)
    .font("Helvetica-Bold")
    .text("Candidate Evaluation Report", 55, 35, { width: doc.page.width - 110 })

  doc
    .fontSize(13)
    .font("Helvetica")
    .text("Olais Eval — Score Card Export", 55, 70, { width: doc.page.width - 110 })

  doc
    .fontSize(10)
    .text(`Generated: ${formatDate(new Date())}`, 55, 95, { width: doc.page.width - 110 })

  // ── Candidate & Problem Section ──
  let yPos = 150

  doc
    .fill(rgb(COLORS.primary))
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Candidate Details", 55, yPos)

  yPos += 28
  doc
    .fill(rgb(COLORS.secondary))
    .fontSize(10)
    .font("Helvetica")

  const candidate = evaluation.submission.user
  const template = evaluation.submission.assignedProblem.template
  const sub = evaluation.submission

  const infoLines = [
    { label: "Name", value: candidate.name || "—" },
    { label: "Email", value: candidate.email },
    { label: "Problem", value: template.title },
    { label: "Category", value: template.category },
    { label: "Difficulty", value: `${template.difficulty}/5` },
    { label: "Submitted", value: formatDate(sub.submittedAt) },
  ]

  // Draw info in two columns
  const col1X = 55
  const col2X = doc.page.width / 2 + 10
  const lineH = 18

  infoLines.forEach((item, i) => {
    const x = i < 3 ? col1X : col2X
    const idx = i < 3 ? i : i - 3
    const y = yPos + idx * lineH

    doc
      .fill(rgb(COLORS.secondary))
      .font("Helvetica-Bold")
      .text(`${item.label}:`, x, y, { width: 90, continued: true })
      .font("Helvetica")
      .fill("#1E293B")
      .text(` ${item.value}`, { width: 200 })
  })

  // ── Divider ──
  yPos += 3 * lineH + 20
  doc
    .moveTo(55, yPos)
    .lineTo(doc.page.width - 55, yPos)
    .strokeColor(rgb(COLORS.border))
    .stroke()

  // ── Dimension Scores ──
  yPos += 25
  doc
    .fill(rgb(COLORS.primary))
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Dimension Scores", 55, yPos)

  yPos += 32

  const scoreMap: Record<string, number> = {}
  DIMENSION_KEYS.forEach((key) => {
    scoreMap[key] = Number(evaluation[key as keyof typeof evaluation]) || 0
  })

  // Score bar dimensions
  const barMaxWidth = 380
  const barHeight = 14
  const labelWidth = 210

  DIMENSION_KEYS.forEach((key) => {
    const label = DIMENSION_LABELS[key]
    const score = scoreMap[key]
    const pct = score / 10

    // Label
    doc
      .fill("#1E293B")
      .fontSize(10)
      .font("Helvetica")
      .text(label, 55, yPos + 1, { width: labelWidth })

    // Score number
    doc
      .fill(rgb(COLORS.secondary))
      .font("Helvetica-Bold")
      .text(`${score}/10`, 55 + labelWidth + barMaxWidth + 10, yPos + 1, { width: 40 })

    // Background bar
    doc
      .roundedRect(55 + labelWidth, yPos, barMaxWidth, barHeight, 3)
      .fill(rgb(COLORS.bg))

    // Filled bar
    const fillColor = score >= 7 ? COLORS.accent : score >= 4 ? COLORS.warning : COLORS.danger
    doc
      .roundedRect(55 + labelWidth, yPos, barMaxWidth * pct, barHeight, 3)
      .fill(rgb(fillColor))

    yPos += barHeight + 10
  })

  // ── Composite Score ──
  yPos += 15
  doc
    .moveTo(55, yPos)
    .lineTo(doc.page.width - 55, yPos)
    .strokeColor(rgb(COLORS.border))
    .stroke()

  yPos += 20
  doc
    .fill(rgb(COLORS.primary))
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Composite Score", 55, yPos)

  yPos += 30

  const totalScore = evaluation.totalScore
  const totalPct = totalScore / 100

  // Large total score circle
  const circleX = 55
  const circleY = yPos + 10
  const circleR = 35

  // Background circle
  doc
    .circle(circleX + circleR, circleY + circleR, circleR)
    .fill(rgb(COLORS.bg))

  // Score ring based on percentage
  const ringColor = totalScore >= 70 ? COLORS.accent : totalScore >= 40 ? COLORS.warning : COLORS.danger
  doc
    .circle(circleX + circleR, circleY + circleR, circleR - 3)
    .lineWidth(4)
    .strokeColor(rgb(ringColor))
    .stroke()

  // Score text
  doc
    .fill("#1E293B")
    .fontSize(22)
    .font("Helvetica-Bold")
    .text(`${Math.round(totalScore)}`, circleX + circleR - 17, circleY + circleR - 12, { width: 40 })

  // Score label next to circle
  doc
    .fill("#1E293B")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(`Total Score: ${Math.round(totalScore)} / 100`, circleX + circleR * 2 + 25, circleY + 10)

  doc
    .fill(rgb(COLORS.secondary))
    .fontSize(10)
    .font("Helvetica")
    .text(
      `Based on 8 evaluation dimensions scored 1–10 each`,
      circleX + circleR * 2 + 25,
      circleY + 32,
      { width: 300 }
    )

  // ── Evaluator Notes ──
  yPos = circleY + circleR * 2 + 40
  doc
    .moveTo(55, yPos)
    .lineTo(doc.page.width - 55, yPos)
    .strokeColor(rgb(COLORS.border))
    .stroke()

  yPos += 25
  doc
    .fill(rgb(COLORS.primary))
    .fontSize(16)
    .font("Helvetica-Bold")
    .text("Evaluator Notes", 55, yPos)

  yPos += 30
  if (evaluation.notes) {
    doc
      .fill("#1E293B")
      .fontSize(10)
      .font("Helvetica")
      .text(evaluation.notes, 55, yPos, {
        width: doc.page.width - 110,
        align: "left",
        lineGap: 4,
      })
  } else {
    doc
      .fill(rgb(COLORS.secondary))
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text("No evaluator notes provided.", 55, yPos)
  }

  // ── Footer / Evaluator Info ──
  const footerY = doc.page.height - 80
  doc
    .moveTo(55, footerY)
    .lineTo(doc.page.width - 55, footerY)
    .strokeColor(rgb(COLORS.border))
    .stroke()

  doc
    .fill(rgb(COLORS.secondary))
    .fontSize(9)
    .font("Helvetica")
    .text(
      `Evaluated by: ${evaluation.evaluator.name || evaluation.evaluator.email}`,
      55,
      footerY + 12
    )
  doc.text(
    `Evaluated on: ${formatDate(evaluation.createdAt)}`,
    55,
    footerY + 26
  )
  doc.text(
    `Evaluation ID: ${evaluation.id}`,
    55,
    footerY + 40
  )

  doc.text(
    "Olais Eval — Confidential",
    doc.page.width - 200,
    footerY + 12,
    { width: 145, align: "right" }
  )

  // ── Finalize ──
  doc.end()

  return new Promise<Buffer>((resolve, reject) => {
    stream.on("end", () => resolve(Buffer.concat(buffers)))
    stream.on("error", reject)
  })
}

// ─── CSV Generation ──────────────────────────────────────────────────────────

async function generateBatchCsv(): Promise<string> {
  const evaluations = await prisma.evaluation.findMany({
    where: { status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    include: {
      submission: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedProblem: {
            include: {
              template: {
                select: { title: true, slug: true, category: true, difficulty: true },
              },
            },
          },
        },
      },
      evaluator: { select: { id: true, name: true, email: true } },
    },
  })

  const headers = [
    "Candidate ID",
    "Candidate Name",
    "Candidate Email",
    "Problem Title",
    "Problem Category",
    "Problem Difficulty",
    "Submission Date",
    "Evaluator Name",
    "Evaluator Email",
    "Evaluation Date",
    "Execution Score",
    "Architecture Score",
    "Thought Process Score",
    "AI Usage Score",
    "Deployment Score",
    "Code Organization Score",
    "UI/UX Score",
    "Communication Score",
    "Composite Score",
    "Evaluator Notes",
  ]

  const rows = evaluations.map((ev) => {
    const sub = ev.submission
    const candidate = sub.user
    const template = sub.assignedProblem.template
    const evaluator = ev.evaluator

    return [
      candidate.id,
      candidate.name ?? "",
      candidate.email,
      template.title,
      template.category,
      template.difficulty,
      formatDate(sub.submittedAt),
      evaluator.name ?? "",
      evaluator.email,
      formatDate(ev.createdAt),
      ev.executionScore,
      ev.architectureScore,
      ev.thoughtProcessScore,
      ev.aiUsageScore,
      ev.deploymentScore,
      ev.codeOrganizationScore,
      ev.uiUxScore,
      ev.communicationScore,
      ev.totalScore,
      ev.notes ?? "",
    ].map(escapeCsv).join(",")
  })

  return [headers.map(escapeCsv).join(","), ...rows].join("\r\n")
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const url = new URL(request.url)
    const format = url.searchParams.get("format") || "csv"
    const evaluationId = url.searchParams.get("evaluationId")

    if (format === "pdf") {
      if (!evaluationId) {
        return NextResponse.json(
          { error: "evaluationId query parameter is required for PDF export" },
          { status: 400 }
        )
      }

      const pdfBuffer = await generateSinglePdf(evaluationId)

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="evaluation-${evaluationId}.pdf"`,
          "Content-Length": String(pdfBuffer.length),
        },
      })
    }

    // CSV export (batch cycle — all completed evaluations)
    const csvContent = await generateBatchCsv()
    const csvBuffer = Buffer.from(csvContent, "utf-8")

    return new NextResponse(new Uint8Array(csvBuffer), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="evaluation-results-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Content-Length": String(csvBuffer.length),
      },
    })
  } catch (error) {
    console.error("Export results error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
