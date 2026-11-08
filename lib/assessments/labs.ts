/**
 * The verification environments skills are grouped into, in the order the
 * catalog shows them. Client-safe: the assessments page imports it.
 */
export const LABS = [
  'Coding Lab',
  'Data Analytics Lab',
  'Finance Lab',
  'Creative and Design Studio',
  'Business Simulation Lab',
  'Communication Studio',
] as const

export type Lab = (typeof LABS)[number]
