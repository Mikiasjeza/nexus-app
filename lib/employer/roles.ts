/**
 * Company roles, safe to use in the browser (no database code here).
 *
 *   owner      everything, including the team
 *   admin      everything, including the team
 *   recruiter  jobs, applicants, shortlists
 *   viewer     look only
 */

export const TEAM_ROLES = ['admin', 'recruiter', 'viewer'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]
export type CompanyRole = 'owner' | TeamRole

export const ROLE_LABELS: Record<CompanyRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  recruiter: 'Recruiter',
  viewer: 'Viewer',
}

export function canManageTeam(role: string): boolean {
  return role === 'owner' || role === 'admin'
}

export function canManageHiring(role: string): boolean {
  return role === 'owner' || role === 'admin' || role === 'recruiter'
}

export function isTeamRole(value: unknown): value is TeamRole {
  return typeof value === 'string' && (TEAM_ROLES as readonly string[]).includes(value)
}
