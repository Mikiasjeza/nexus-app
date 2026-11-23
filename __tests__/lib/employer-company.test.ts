import { slugifyCompanyName, uniqueCompanySlug, createCompanyForUser } from '@/lib/employer/company'

describe('employer company helpers', () => {
  it('turns a company name into a slug', () => {
    expect(slugifyCompanyName('Acme Inc.')).toBe('acme-inc')
    expect(slugifyCompanyName('  Ünïcode & Co  ')).toBe('n-code-co')
    expect(slugifyCompanyName('***')).toBe('company')
  })

  it('picks the first slug no other company uses', async () => {
    const taken = new Set(['acme', 'acme-1'])
    const db = {
      company: {
        findUnique: jest.fn(async ({ where }: { where: { slug: string } }) =>
          taken.has(where.slug) ? { id: 'x' } : null
        ),
      },
    }
    await expect(uniqueCompanySlug(db as never, 'Acme')).resolves.toBe('acme-2')
  })

  it('creates the company with the person as owner and skips candidate onboarding', async () => {
    const db = {
      company: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: { name: string; slug: string } }) => ({
          id: 'c1',
          ...data,
        })),
      },
      user: { update: jest.fn(async () => ({})) },
    }
    const company = await createCompanyForUser(db as never, 'u1', '  Acme  ')

    expect(company).toMatchObject({ id: 'c1', name: 'Acme', slug: 'acme' })
    expect(db.company.create).toHaveBeenCalledWith({
      data: { name: 'Acme', slug: 'acme', members: { create: { userId: 'u1', role: 'owner' } } },
    })
    expect(db.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { onboardingComplete: true },
    })
  })
})
