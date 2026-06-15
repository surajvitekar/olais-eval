import { describe, it, expect } from "vitest"
import { renderOutcomeSelectedEmail } from "./outcome-selected"
import { renderOutcomeRejectedEmail } from "./outcome-rejected"

describe("renderOutcomeSelectedEmail", () => {
  it("returns a string containing the candidateName", () => {
    const html = renderOutcomeSelectedEmail({ candidateName: "Alice Smith" })
    expect(typeof html).toBe("string")
    expect(html).toContain("Alice Smith")
  })

  it("includes nextSteps when provided", () => {
    const html = renderOutcomeSelectedEmail({
      candidateName: "Bob",
      nextSteps: "Please schedule an onboarding call at your earliest convenience",
    })
    expect(html).toContain("Please schedule an onboarding call at your earliest convenience")
  })

  it("shows a generic message when nextSteps not provided", () => {
    const html = renderOutcomeSelectedEmail({ candidateName: "Carol" })
    // Should not crash and should include some 'in touch / soon / detail' text
    expect(html.toLowerCase()).toMatch(/touch|detail|soon/)
  })
})

describe("renderOutcomeRejectedEmail", () => {
  it("returns a string containing the candidateName", () => {
    const html = renderOutcomeRejectedEmail({ candidateName: "Dave Jones" })
    expect(typeof html).toBe("string")
    expect(html).toContain("Dave Jones")
  })

  it("includes feedback when provided", () => {
    const html = renderOutcomeRejectedEmail({
      candidateName: "Eve",
      feedback: "Strong technical skills but lacked system design experience",
    })
    expect(html).toContain("Strong technical skills but lacked system design experience")
  })
})
