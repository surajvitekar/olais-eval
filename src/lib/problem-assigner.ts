import prisma from "@/lib/prisma"

/**
 * ProblemAssigner
 *
 * Takes a candidate's top 3 skills (from SkillProfile.topSkills),
 * finds active problems in matching categories, and picks 2 problems
 * from different variant_groups. The selection is deterministic by user ID.
 */
export async function assignProblems(userId: string) {
  // 1. Fetch the candidate's latest skill profile
  const profile = await prisma.skillProfile.findFirst({
    where: { userId },
    orderBy: { generatedAt: "desc" },
  })

  if (!profile) {
    throw new Error("No skill profile found. Complete the assessment first.")
  }

  const topSkills = (profile.topSkills as string[]).slice(0, 3)

  if (topSkills.length === 0) {
    throw new Error("No skills identified in profile.")
  }

  // 2. Map assessment categories (e.g., FRONTEND, BACKEND) to problem categories (e.g., full-stack, apis)
  const categoryMap: Record<string, string[]> = {
    FRONTEND: ["frontend", "full-stack"],
    BACKEND: ["full-stack"],
    PYTHON: ["automation", "data"],
    AI_ML: ["full-stack", "frontend"],
    API: ["full-stack"],
    DATABASE: ["full-stack"],
    DEVOPS: ["full-stack"],
    UI_UX: ["frontend", "full-stack"],
    AUTOMATION: ["automation", "frontend"],
    SYSTEM_DESIGN: ["full-stack"],
  }

  // Collect all matching problem categories
  const matchingCategories = new Set<string>()
  for (const skill of topSkills) {
    const mapped = categoryMap[skill]
    if (mapped) {
      mapped.forEach((c) => matchingCategories.add(c))
    }
  }

  if (matchingCategories.size === 0) {
    // Fallback: use all categories
    const allProblems = await prisma.problemTemplate.findMany({
      where: { isActive: true },
      select: { id: true, variantGroup: true },
    })
    return pickTwoFromDifferentGroups(allProblems, userId)
  }

  // 3. Find active problems in matching categories
  const problems = await prisma.problemTemplate.findMany({
    where: {
      isActive: true,
      category: { in: Array.from(matchingCategories) },
    },
    select: {
      id: true,
      category: true,
      variantGroup: true,
      difficulty: true,
    },
  })

  if (problems.length === 0) {
    // Fallback: any active problem
    const allProblems = await prisma.problemTemplate.findMany({
      where: { isActive: true },
      select: { id: true, variantGroup: true },
    })
    return pickTwoFromDifferentGroups(allProblems, userId)
  }

  return pickTwoFromDifferentGroups(problems, userId)
}

interface ProblemRef {
  id: string
  variantGroup: string | null
  [key: string]: unknown
}

/**
 * Pick 2 problems from different variant_groups.
 * Deterministic by user ID — uses sum of char codes to seed.
 */
function pickTwoFromDifferentGroups(
  problems: ProblemRef[],
  userId: string
): ProblemRef[] {
  if (problems.length === 0) return []
  if (problems.length === 1) return [problems[0]]

  // Group by variantGroup (null = unique group)
  const groups = new Map<string, ProblemRef[]>()
  for (const p of problems) {
    const key = p.variantGroup ?? `__unique_${p.id}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const groupKeys = Array.from(groups.keys())

  if (groupKeys.length === 1) {
    // Only one group — pick 2 from it
    const sameGroup = groups.get(groupKeys[0])!
    return pickDeterministic(sameGroup, userId, 2)
  }

  // Deterministic "seed" from userId
  let seed = 0
  for (let i = 0; i < userId.length; i++) {
    seed += userId.charCodeAt(i)
  }

  // Pick first from one group, second from another
  const idx1 = seed % groupKeys.length
  const group1 = groups.get(groupKeys[idx1])!
  const pick1 = pickDeterministic(group1, userId, 1)[0]

  // Second group: skip the first group's key
  let remainingKeys = groupKeys.filter((_, i) => i !== idx1)
  if (remainingKeys.length === 0) remainingKeys = groupKeys

  const idx2 = (seed + 7) % remainingKeys.length
  const group2 = groups.get(remainingKeys[idx2])!
  const pick2 = pickDeterministic(group2, userId + "salt", 1)[0]

  return [pick1, pick2].filter(Boolean)
}

/**
 * Pick N items deterministically from an array using userId as seed.
 */
function pickDeterministic<T>(arr: T[], seed: string, count: number): T[] {
  const shuffled = [...arr]
  let s = 0
  for (let i = 0; i < seed.length; i++) {
    s += seed.charCodeAt(i)
  }

  // Simple deterministic shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (s + i) % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    s = (s * 31 + 17) & 0xffffffff
  }

  return shuffled.slice(0, Math.min(count, shuffled.length))
}
