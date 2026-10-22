import { normalizeSkillCategory } from '@/lib/skills-taxonomy'

describe('normalizeSkillCategory', () => {
  it.each([
    'Technical Skills',
    'Creative Skills',
    'Communication Skills',
    'Professional Skills',
    'Learning & Growth',
  ] as const)('keeps the current category name %s', (category) => {
    expect(normalizeSkillCategory(category)).toBe(category)
  })

  it('maps legacy names onto the current pillars', () => {
    expect(normalizeSkillCategory('technical')).toBe('Technical Skills')
    expect(normalizeSkillCategory('leadership')).toBe('Professional Skills')
    expect(normalizeSkillCategory('other')).toBe('Learning & Growth')
  })
})
