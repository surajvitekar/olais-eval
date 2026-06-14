import type { UserRole } from "@/types"

// ─── Permission Enum ──────────────────────────────────────────────────────────
// Granular permissions that can be assigned to roles.
export enum Permission {
  // Admin dashboard
  VIEW_DASHBOARD = "VIEW_DASHBOARD",
  VIEW_STATS = "VIEW_STATS",

  // Candidates
  VIEW_CANDIDATES = "VIEW_CANDIDATES",
  MANAGE_CANDIDATES = "MANAGE_CANDIDATES",

  // Submissions
  VIEW_SUBMISSIONS = "VIEW_SUBMISSIONS",
  EVALUATE_SUBMISSIONS = "EVALUATE_SUBMISSIONS",

  // Evaluations
  VIEW_EVALUATIONS = "VIEW_EVALUATIONS",

  // Problems
  VIEW_PROBLEMS = "VIEW_PROBLEMS",
  MANAGE_PROBLEMS = "MANAGE_PROBLEMS",

  // Invites
  VIEW_INVITES = "VIEW_INVITES",
  CREATE_INVITES = "CREATE_INVITES",

  // Leaderboard
  VIEW_LEADERBOARD = "VIEW_LEADERBOARD",
  MANAGE_LEADERBOARD = "MANAGE_LEADERBOARD",

  // Settings
  VIEW_SETTINGS = "VIEW_SETTINGS",
  MANAGE_SETTINGS = "MANAGE_SETTINGS",

  // Admin management
  MANAGE_ADMINS = "MANAGE_ADMINS",

  // Audit logs
  VIEW_AUDIT_LOGS = "VIEW_AUDIT_LOGS",
}

// ─── Role → Permission Mapping ────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: Object.values(Permission),

  ADMIN: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STATS,
    Permission.VIEW_CANDIDATES,
    Permission.MANAGE_CANDIDATES,
    Permission.VIEW_SUBMISSIONS,
    Permission.EVALUATE_SUBMISSIONS,
    Permission.VIEW_EVALUATIONS,
    Permission.VIEW_PROBLEMS,
    Permission.MANAGE_PROBLEMS,
    Permission.VIEW_INVITES,
    Permission.CREATE_INVITES,
    Permission.VIEW_LEADERBOARD,
    Permission.MANAGE_LEADERBOARD,
    Permission.VIEW_SETTINGS,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
  ],

  REVIEWER: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STATS,
    Permission.VIEW_CANDIDATES,
    Permission.VIEW_SUBMISSIONS,
    Permission.EVALUATE_SUBMISSIONS,
    Permission.VIEW_EVALUATIONS,
    Permission.VIEW_PROBLEMS,
    Permission.VIEW_LEADERBOARD,
    Permission.VIEW_AUDIT_LOGS,
  ],

  HIRING_MANAGER: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STATS,
    Permission.VIEW_CANDIDATES,
    Permission.MANAGE_CANDIDATES,
    Permission.VIEW_SUBMISSIONS,
    Permission.VIEW_EVALUATIONS,
    Permission.VIEW_PROBLEMS,
    Permission.VIEW_INVITES,
    Permission.CREATE_INVITES,
    Permission.VIEW_LEADERBOARD,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
  ],

  READ_ONLY: [
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_STATS,
    Permission.VIEW_CANDIDATES,
    Permission.VIEW_SUBMISSIONS,
    Permission.VIEW_EVALUATIONS,
    Permission.VIEW_PROBLEMS,
    Permission.VIEW_INVITES,
    Permission.VIEW_LEADERBOARD,
    Permission.VIEW_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
  ],

  CANDIDATE: [],
}

// ─── RBAC Admin Roles (roles that are "admin-level") ──────────────────────────
const ADMIN_ROLES: UserRole[] = [
  "SUPER_ADMIN" as UserRole,
  "ADMIN" as UserRole,
  "REVIEWER" as UserRole,
  "HIRING_MANAGER" as UserRole,
  "READ_ONLY" as UserRole,
]

// ─── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Check if a user role has a specific permission.
 */
export function hasPermission(role: UserRole | undefined | null, permission: Permission): boolean {
  if (!role) return false
  const perms = ROLE_PERMISSIONS[role]
  if (!perms) return false
  return perms.includes(permission)
}

/**
 * Check if a user role is an admin-level role (has access to /admin).
 */
export function isAdminRole(role: UserRole | undefined | null): boolean {
  if (!role) return false
  return ADMIN_ROLES.includes(role)
}

/**
 * Check if a user role has any of the specified permissions.
 */
export function hasAnyPermission(role: UserRole | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.some((p) => hasPermission(role, p))
}

/**
 * Check if a user role has all of the specified permissions.
 */
export function hasAllPermissions(role: UserRole | undefined | null, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.every((p) => hasPermission(role, p))
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: UserRole | undefined | null): Permission[] {
  if (!role) return []
  return ROLE_PERMISSIONS[role] ?? []
}
