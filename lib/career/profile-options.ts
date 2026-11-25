/**
 * Choices for the Career Profile (education, experience, interests,
 * preferences). Browser-safe: no database code here.
 */

export const EDUCATION_LEVELS = [
  { id: 'high_school', label: 'High school diploma' },
  { id: 'ged', label: 'GED' },
  { id: 'trade', label: 'Trade school or vocational training' },
  { id: 'associate', label: 'Associate degree' },
  { id: 'bachelor', label: "Bachelor's degree" },
  { id: 'master', label: "Master's degree" },
  { id: 'doctorate', label: 'Doctoral degree' },
  { id: 'other', label: 'Other' },
] as const
export type EducationLevel = (typeof EDUCATION_LEVELS)[number]['id']

/** Completed and in-progress are kept apart everywhere. */
export const EDUCATION_STATUSES = [
  { id: 'completed', label: 'Completed' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'incomplete', label: 'Attended, not completed' },
] as const
export type EducationStatus = (typeof EDUCATION_STATUSES)[number]['id']

export const EMPLOYMENT_TYPES = [
  { id: 'full_time', label: 'Full-time' },
  { id: 'part_time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'internship', label: 'Internship' },
  { id: 'apprenticeship', label: 'Apprenticeship' },
  { id: 'freelance', label: 'Freelance' },
  { id: 'volunteer', label: 'Volunteer' },
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]['id']

export const EMPLOYMENT_STATUSES = [
  { id: 'employed', label: 'Employed' },
  { id: 'student', label: 'Student' },
  { id: 'looking', label: 'Looking for work' },
  { id: 'freelancing', label: 'Freelancing' },
  { id: 'career_change', label: 'Changing careers' },
  { id: 'other', label: 'Other' },
] as const

export const CERTIFICATION_KINDS = [
  { id: 'certification', label: 'Certification' },
  { id: 'license', label: 'Professional license' },
] as const

export const CAREER_INTERESTS = [
  'Technology',
  'Software Engineering',
  'Data Analytics',
  'Cybersecurity',
  'Finance',
  'Accounting',
  'Business',
  'Consulting',
  'Marketing',
  'Sales',
  'Design',
  'Engineering',
  'Healthcare',
  'Education',
  'Operations',
  'Human Resources',
  'Legal',
  'Government',
] as const

export const WORK_ARRANGEMENTS = [
  { id: 'remote', label: 'Remote' },
  { id: 'hybrid', label: 'Hybrid' },
  { id: 'onsite', label: 'In person' },
] as const

export const EXPERIENCE_LEVELS = [
  { id: 'internship', label: 'Internship' },
  { id: 'entry', label: 'Entry level' },
  { id: 'mid', label: 'Experienced' },
  { id: 'senior', label: 'Senior' },
] as const

export const JOB_TYPES = [
  { id: 'full-time', label: 'Full-time' },
  { id: 'part-time', label: 'Part-time' },
  { id: 'contract', label: 'Contract' },
  { id: 'internship', label: 'Internship' },
] as const

export const AVAILABILITY = [
  { id: 'now', label: 'Available now' },
  { id: '1_month', label: 'Within a month' },
  { id: '3_months', label: 'Within 3 months' },
  { id: 'after_graduation', label: 'After I graduate' },
  { id: 'not_looking', label: 'Not looking yet' },
] as const

/** Which Nexus assessments fit each career interest, for recommendations. */
export const INTEREST_ASSESSMENTS: Record<string, string[]> = {
  Technology: ['javascript', 'python', 'typescript'],
  'Software Engineering': ['javascript', 'typescript', 'python'],
  'Data Analytics': ['sql', 'python'],
  Cybersecurity: ['python'],
  Finance: ['financial-analysis', 'business-writing'],
  Accounting: ['financial-analysis'],
  Business: ['project-management', 'business-writing'],
  Consulting: ['business-writing', 'project-management'],
  Marketing: ['business-writing', 'ux-writing'],
  Sales: ['business-writing'],
  Design: ['ux-writing'],
  Engineering: ['python'],
  Operations: ['project-management'],
  'Human Resources': ['business-writing'],
  Government: ['business-writing', 'project-management'],
}

export function labelOf(
  list: readonly { id: string; label: string }[],
  id: string | null | undefined
) {
  return list.find((item) => item.id === id)?.label ?? id ?? ''
}

/** Everything a user's own data starts as; only Nexus checks can change it. */
export const SELF_REPORTED = 'self_reported'
