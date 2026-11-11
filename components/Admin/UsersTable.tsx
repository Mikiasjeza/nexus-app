import Link from 'next/link'
import { formatDate, timeAgo } from '@/components/Admin/format'
import { PLAN_INFO } from '@/lib/plans'
import type { AdminUserRow } from '@/lib/admin/users'

/**
 * One row per person. Narrow screens keep the name, email and plan; the other
 * columns appear as there is room. While a new page loads, the old rows stay
 * put and dim, so nothing jumps.
 */
export default function UsersTable({
  users,
  loading = false,
}: {
  users: AdminUserRow[]
  loading?: boolean
}) {
  return (
    <table
      className={`w-full text-left text-sm transition-opacity duration-150 ${loading ? 'opacity-50' : ''}`}
      aria-busy={loading}
    >
      <thead>
        <tr className="border-y border-line text-ink-faint">
          <th scope="col" className="py-3 pr-4 font-normal">
            Person
          </th>
          <th scope="col" className="hidden py-3 pr-4 font-normal sm:table-cell">
            Joined
          </th>
          <th scope="col" className="hidden py-3 pr-4 font-normal md:table-cell">
            Signs in with
          </th>
          <th scope="col" className="py-3 pr-4 font-normal">
            Plan
          </th>
          <th scope="col" className="hidden py-3 pr-4 text-right font-normal sm:table-cell">
            Assessments
          </th>
          <th scope="col" className="hidden py-3 pr-4 text-right font-normal lg:table-cell">
            Credentials
          </th>
          <th scope="col" className="hidden py-3 font-normal lg:table-cell">
            Last active
          </th>
        </tr>
      </thead>
      <tbody>
        {users.map((user) => (
          <tr key={user.id} className="border-b border-line align-baseline">
            <th scope="row" className="py-3 pr-4 font-normal">
              <Link
                href={`/admin/users/${user.id}`}
                className="block break-words underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink"
              >
                {user.name}
              </Link>
              <span className="mt-0.5 block break-all text-ink-faint">{user.email}</span>
            </th>
            <td className="hidden whitespace-nowrap py-3 pr-4 text-ink-muted sm:table-cell">
              {formatDate(user.createdAt)}
            </td>
            <td className="hidden py-3 pr-4 text-ink-muted md:table-cell">
              {user.methods.join(', ')}
            </td>
            <td className="whitespace-nowrap py-3 pr-4">
              <span className={user.plan === 'free' ? 'text-ink-muted' : 'text-verified-ink'}>
                {PLAN_INFO[user.plan].name}
              </span>
            </td>
            <td className="tabular hidden whitespace-nowrap py-3 pr-4 text-right sm:table-cell">
              {user.assessments}
              {user.passed > 0 && <span className="text-ink-faint"> · {user.passed} passed</span>}
            </td>
            <td className="tabular hidden py-3 pr-4 text-right lg:table-cell">
              {user.credentials}
            </td>
            <td className="hidden whitespace-nowrap py-3 text-ink-muted lg:table-cell">
              {timeAgo(user.lastActiveAt)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
