# Eval.olais — TDD Go-to-Market Plan

## Framework
Every PRD pipeline stage below is a test-first task. For each:
1. Write tests that define "done" for the module
2. Check if module exists
3. If yes → run tests, identify gaps, patch
4. If no → implement from scratch with tests passing

---

## Stage 1 — Candidate Invitation & Onboarding
**PRD §5.1 / Pipeline step 5**

**Modules:**
- `src/app/api/invite/[code]/route.ts` — EXISTS
- `src/app/api/admin/invites/route.ts` — EXISTS
- `src/app/api/admin/invites/bulk/route.ts` — EXISTS
- `src/lib/invites/parser.ts` — EXISTS

**Tests needed:**
- [ ] Invite code creation with expiry + maxUses enforcement
- [ ] Expired invite returns clean error
- [ ] Bulk invite CSV/JSON parsing parses correctly, rejects malformed rows
- [ ] Sign-in redirect after invite use
- [ ] Registration flow for new candidates (name, email, password)

**Status:** Module EXISTS. Needs test coverage audit + edge case hardening.

---

## Stage 2 — Skill Questionnaire
**PRD §5.2 / Pipeline step 6**

**Modules:**
- `src/app/api/candidate/assessment/questions/route.ts` — EXISTS
- `src/components/assessment/QuestionCard.tsx` — EXISTS
- `src/types/index.ts` — EXISTS (AssessmentQuestion schema)

**Tests needed:**
- [ ] Questions returned match configured count (default 20, configurable)
- [ ] Questions are skill-targeted based on candidate profile
- [ ] Question submission validates all required fields
- [ ] Category/difficulty distribution is correct
- [ ] Configurable question count works end-to-end

**Status:** Module EXISTS. Need to verify configurable count works vs hardcoded.

---

## Stage 3 — Problem Assignment
**PRD §5.3 / Pipeline step 7**

**Modules:**
- `src/app/api/candidate/problems/assign/route.ts` — EXISTS
- `src/lib/problem-assigner.ts` — EXISTS
- `src/app/api/admin/generate-problem/route.ts` — EXISTS
- `src/components/admin/AIProblemGenerator.tsx` — EXISTS

**Tests needed:**
- [ ] Problem assigned based on skill profile
- [ ] Configurable problem count (default 2) works
- [ ] Timer/deadline enforced on frontend and server
- [ ] AI-generated problems are valid and unique per candidate
- [ ] Variant group rotation works (no two candidates in same drive get identical problems)

**Status:** Module EXISTS. Timer enforcement server-side needs verification.

---

## Stage 4 — Submission
**PRD §5.3 / Pipeline step 8**

**Modules:**
- `src/app/api/candidate/submit/route.ts` — EXISTS
- `src/components/problems/SubmissionForm.tsx` — EXISTS
- `src/components/problems/AIDeclaration.tsx` — EXISTS
- `src/components/problems/Timer.tsx` — EXISTS

**Tests needed:**
- [ ] Submission stores solution + AI prompts together
- [ ] Late submission rejected when timer expired
- [ ] AI declaration is required, not optional
- [ ] Duplicate submission rejected (unique on userId + assignedProblemId)
- [ ] Submission triggers status update to SUBMITTED

**Status:** Module EXISTS. Late-submission enforcement needs verification.

---

## Stage 5 — AI Scoring
**PRD §5.4 / Pipeline step 9**

**Modules:**
- `src/app/api/admin/evaluate-auto/[submissionId]/route.ts` — EXISTS
- `src/lib/evaluations/scoring.ts` — EXISTS
- `src/scripts/backfill-gamification.ts` — EXISTS (related)

**Tests needed:**
- [ ] Score includes execution, thought process, architecture, UI/UX, AI usage, deployment, code org, communication
- [ ] Total score is weighted average of all dimensions
- [ ] AI usage score is computed from declaration + prompt analysis
- [ ] Auto-scorer handles empty/malformed submissions gracefully
- [ ] Score is persisted and retrievable
- [ ] Rubric weighting configurable per role (PRD §5.4 open question)

**Status:** Module EXISTS. Rubric customisation (PRD open question §10) needs resolution. Scoring may be opinionated-only currently.

---

## Stage 6 — Threshold Gate ⚠️ GAP
**PRD §5.5 / Pipeline step 10**

**Modules:**
- NOT FOUND — No dedicated threshold module or gate component

**Tests needed:**
- [ ] Configurable pass threshold per drive/role
- [ ] Score >= threshold → advances to scheduling
- [ ] Score < threshold → closed with notification
- [ ] Threshold persists per drive config
- [ ] Audit log entry on threshold decision

**Status:** MODULE MISSING. Must create from scratch:
- `src/lib/threshold-gate.ts` — gate logic + config
- `src/app/api/candidate/assessment/threshold/route.ts` — API endpoint
- DB: threshold column on drive/role config or new table

---

## Stage 7 — Interview Scheduling
**PRD §5.6 / Pipeline step 11**

**Modules:**
- `src/app/api/admin/interviews/route.ts` — EXISTS (CRUD)
- `src/app/api/admin/interviews/[id]/route.ts` — EXISTS
- `src/app/api/admin/interviews/[id]/evaluators/route.ts` — EXISTS
- `src/app/api/admin/interviews/[id]/draft/route.ts` — EXISTS (draft notes)
- `src/app/api/admin/interviews/[id]/helper/route.ts` — EXISTS (helper data)
- `src/app/api/admin/interviews/[id]/score/route.ts` — EXISTS (scoring)
- `src/app/api/admin/interviews/[id]/send-email/route.ts` — EXISTS
- `src/app/api/admin/interviews/my/route.ts` — EXISTS
- `src/lib/timezone/detect.ts` — EXISTS

**Tests needed:**
- [ ] Interview created with candidate + optional evaluator
- [ ] Availability check across interviewers
- [ ] Auto-assignment logic works (by availability + skill match)
- [ ] Meeting link generation (internal/external) works
- [ ] Interview status transitions correctly (SCHEDULED → COMPLETED → CANCELLED)

**Status:** Module EXISTS. Auto-assignment + meeting link generation need verification.

---

## Stage 8 — WhatsApp Communication ⚠️ GAP
**PRD §5.7 / Pipeline step 11 (notifications)**

**Modules:**
- NOT FOUND — No WhatsApp module in src/. The bridge at `scripts/whatsapp-bridge/bridge.js` exists externally

**Tests needed:**
- [ ] WhatsApp notification sent to candidate on interview schedule
- [ ] WhatsApp notification sent to interviewer on assignment
- [ ] Reminder notification sent N hours before interview
- [ ] Outcome notification sent after decision
- [ ] Template messages are configurable per org/drive
- [ ] Delivery confirmation / failure handling
- [ ] Fallback to email if WhatsApp fails

**Status:** MODULE PARTIAL. WhatsApp bridge exists externally (Node bridge.js). Need:
- `src/lib/notifications/whatsapp.ts` — wrapper around bridge API
- `src/lib/notifications/index.ts` — orchestrator (WhatsApp + email fallback)
- `src/app/api/notifications/route.ts` — status check endpoint

---

## Stage 9 — AI Interview Review & Scorecard ⚠️ PARTIAL
**PRD §5.8–5.9 / Pipeline steps 12–13**

**Modules:**
- `src/lib/ai-collaboration/analyzer.ts` — EXISTS (analyzes AI prompts from submissions)
- `src/lib/ai-collaboration/report.ts` — EXISTS (generates collaboration report)

**Gaps:**
- No "internal provider" interview mode — AI-capability assessment during live interview
- No interview recording analysis
- No structured scorecard generation from interview

**Tests needed:**
- [ ] AI collaboration score generated from submission prompts
- [ ] Interview recording is accessible for analysis
- [ ] AI generates structured scorecard from interview
- [ ] AI-capability assessment during interview (for internal provider)
- [ ] Configurable: AI-capability scoring on/off per role

**Status:** MODULE EXISTS for post-submission analysis. INTERNAL PROVIDER interview mode needs creation.

---

## Stage 10 — Approve / Tweak / Reject
**PRD §5.9 / Pipeline step 14**

**Modules:**
- `src/app/api/admin/interviews/[id]/score/route.ts` — EXISTS (PUT to submit scores)
- `src/app/admin/interviews/[id]/helper/page.tsx` — EXISTS (helper UI)
- `src/app/admin/interviews/page.tsx` — EXISTS (list view)

**Tests needed:**
- [ ] Interviewer can view AI-generated scorecard
- [ ] Interviewer can approve scorecard with one click
- [ ] Interviewer can edit individual scoring dimensions
- [ ] Interviewer can reject and provide reason
- [ ] Audit log records approval/edit/reject action
- [ ] Bulk mode: leaderboard updates after approval

**Status:** Module EXISTS. Need end-to-end test for the approval workflow.

---

## Stage 11 — Leaderboard & Cutoffs
**PRD §5.10 / Pipeline step 14 (bulk mode)**

**Modules:**
- `src/app/api/admin/leaderboard/route.ts` — EXISTS (verified 200 OK after fix)
- `src/app/api/admin/leaderboard/[id]/route.ts` — EXISTS
- `src/app/api/leaderboard/route.ts` — EXISTS (public)
- `src/components/leaderboard/` — 7 components: BadgeDisplay, LeaderboardRow, LevelBadge, PersonalStatsPanel, PodiumSection, PositionChange, XPProgressBar — ALL EXIST
- `src/lib/leaderboard-sync.ts` — EXISTS
- `src/lib/gamification.ts` — EXISTS

**Tests needed:**
- [ ] Leaderboard returns ranked entries with scores
- [ ] Configurable cutoffs filter correctly
- [ ] XP/level/badges compute correctly
- [ ] Position change (rank change) calculates correctly
- [ ] Hidden candidates excluded from public leaderboard
- [ ] Bulk mode: cutoff changes update visible candidates

**Status:** Module EXISTS. Recently fixed 500 error on leaderboard endpoint. Need test coverage.

---

## Stage 12 — Hire/Reject Recommendation ⚠️ PARTIAL
**PRD §5.10 / Pipeline step 14 (single mode)**

**Modules:**
- No dedicated single-mode recommendation API found
- Scoring exists but recommendation logic not found

**Tests needed:**
- [ ] Combined score from evaluation + interview produces hire/reject recommendation
- [ ] Recommendation includes supporting reasoning
- [ ] Confidence level or threshold displayed
- [ ] Recommendation editable by interviewer before finalizing

**Status:** MODULE PARTIAL. Scoring exists but hire/reject recommendation as a distinct output needs creation.

---

## Stage 13 — Outcome Notification
**PRD §5.11 / Pipeline step 15**

**Modules:**
- `src/lib/email/templates/` — EXISTS (4 templates: invite, assessment-assigned, deadline-reminder, results-available)
- `src/lib/email/send.ts` — EXISTS
- `src/lib/email/interview.ts` — EXISTS

**Tests needed:**
- [ ] Selection/rejection notification sent to candidate
- [ ] Template is configurable per org/drive
- [ ] Next-step instructions included in notification
- [ ] WhatsApp notification also sent (see Stage 8)
- [ ] Notification history logged

**Status:** Email EXISTS. WhatsApp notification path is gated on Stage 8.

---

## Summary

| Stage | PRD § | Module Exists? | Action |
|---|---|---|---|
| 1 | Invitation | ✓ EXISTS | Add tests |
| 2 | Skill Questionnaire | ✓ EXISTS | Verify configurable count |
| 3 | Problem Assignment | ✓ EXISTS | Verify server-side timer |
| 4 | Submission | ✓ EXISTS | Verify late-submission enforcement |
| 5 | AI Scoring | ✓ EXISTS | Resolve rubric customisation |
| 6 | Threshold Gate | ✗ MISSING | CREATE from scratch |
| 7 | Interview Scheduling | ✓ EXISTS | Verify auto-assignment |
| 8 | WhatsApp Communication | ✗ MISSING | CREATE notification layer |
| 9 | AI Interview Review | ~ PARTIAL | Internal provider mode needed |
| 10 | Approve/Tweak/Reject | ✓ EXISTS | Add end-to-end test |
| 11 | Leaderboard & Cutoffs | ✓ EXISTS | Add test coverage |
| 12 | Hire/Reject Recommendation | ~ PARTIAL | Recommendation logic needed |
| 13 | Outcome Notification | ✓ EXISTS (email) | WhatsApp gated on Stage 8 |
