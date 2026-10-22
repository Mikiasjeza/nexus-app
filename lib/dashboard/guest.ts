import { guestSkills } from '@/lib/mock/guest'
import type { DashboardActivityRow, DashboardInput } from './summary'

const DAY_MS = 86_400_000

/**
 * Sample rows for guest mode and the logged-out preview, so the dashboard
 * shows what it does with a few weeks of real use. Seeded, so every render of
 * the same day matches.
 */
export function buildGuestDashboardInput(now: Date): DashboardInput {
  const at = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY_MS)
  const createdDaysAgo: Record<string, number> = { 'skill-1': 80, 'skill-2': 30, 'skill-3': 75 }

  const skills = guestSkills.map((skill) => ({
    id: skill.id,
    name: skill.name,
    category: skill.category,
    verified: Boolean(skill.verified),
    createdAt: at(createdDaysAgo[skill.id] ?? 60),
  }))

  const analyses = [
    {
      id: 'guest-check-4',
      skillId: 'skill-2',
      confidenceScore: 0.58,
      improvements: [
        'Add a case study that shows the problem, your design and what changed after launch',
      ],
      createdAt: at(4),
    },
    {
      id: 'guest-check-3',
      skillId: 'skill-1',
      confidenceScore: 0.84,
      improvements: [],
      createdAt: at(20),
    },
    {
      id: 'guest-check-2',
      skillId: 'skill-1',
      confidenceScore: 0.61,
      improvements: ['Link the repository so the AI can see the commits are yours'],
      createdAt: at(36),
    },
    {
      id: 'guest-check-1',
      skillId: 'skill-3',
      confidenceScore: 0.77,
      improvements: [],
      createdAt: at(50),
    },
  ]

  const verifiedChanges = [
    { skillId: 'skill-3', timestamp: at(50), oldValue: false, newValue: true },
    { skillId: 'skill-1', timestamp: at(20), oldValue: false, newValue: true },
  ]

  let seed = 11
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const activities: DashboardActivityRow[] = []
  for (let daysAgo = 210; daysAgo >= 0; daysAgo--) {
    const weekend = [0, 6].includes(at(daysAgo).getDay())
    const busy = weekend ? 0.05 : 0.08 + ((210 - daysAgo) / 210) * 0.4
    if (random() < busy) {
      const count = Math.ceil(random() * 3)
      for (let i = 0; i < count; i++) {
        activities.push({
          skillId: null,
          timestamp: new Date(at(daysAgo).getTime() - i * 3_600_000),
        })
      }
    }
  }

  return { now, skills, analyses, verifiedChanges, activities }
}
