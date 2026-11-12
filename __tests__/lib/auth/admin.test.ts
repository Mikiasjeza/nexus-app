/**
 * @jest-environment node
 */

import { ADMIN_CONFIRMATION_REQUIRED_FROM, adminEmails, isAdminAccount } from '@/lib/auth/admin'

const before = new Date(ADMIN_CONFIRMATION_REQUIRED_FROM.getTime() - 86_400_000)
const after = new Date(ADMIN_CONFIRMATION_REQUIRED_FROM.getTime() + 86_400_000)

const original = process.env.ADMIN_EMAILS

beforeEach(() => {
  process.env.ADMIN_EMAILS = ' Owner@Example.com , second@example.com,,'
})

afterAll(() => {
  if (original === undefined) delete process.env.ADMIN_EMAILS
  else process.env.ADMIN_EMAILS = original
})

describe('admin accounts', () => {
  it('reads the list in lower case, ignoring spaces and blanks', () => {
    expect(adminEmails()).toEqual(['owner@example.com', 'second@example.com'])
  })

  it('admits a listed account whose address is confirmed', () => {
    expect(
      isAdminAccount({ email: 'OWNER@example.com', emailVerified: true, createdAt: after })
    ).toBe(true)
  })

  it('keeps the access of listed accounts created before the rule', () => {
    expect(
      isAdminAccount({ email: 'owner@example.com', emailVerified: false, createdAt: before })
    ).toBe(true)
  })

  it('refuses a newer listed account nobody has confirmed (someone may have registered it)', () => {
    expect(
      isAdminAccount({ email: 'second@example.com', emailVerified: false, createdAt: after })
    ).toBe(false)
  })

  it('refuses anyone not on the list', () => {
    expect(
      isAdminAccount({ email: 'someone@example.com', emailVerified: true, createdAt: before })
    ).toBe(false)
    expect(isAdminAccount(null)).toBe(false)
  })

  it('refuses everyone when the list is empty', () => {
    process.env.ADMIN_EMAILS = ''
    expect(
      isAdminAccount({ email: 'owner@example.com', emailVerified: true, createdAt: before })
    ).toBe(false)
  })
})
