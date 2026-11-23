import { providerSummaries } from '@/lib/auth/oauth/providers'
import RegisterForm from './RegisterForm'

// Which "Continue with …" buttons to show depends on the server's settings.
export const dynamic = 'force-dynamic'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; next?: string }>
}) {
  // /auth/register?type=employer opens on the hiring side.
  const { type, next } = await searchParams
  return (
    <RegisterForm
      providers={providerSummaries()}
      initialSide={type === 'employer' ? 'employer' : 'candidate'}
      next={next?.startsWith('/employer/invite') ? next : undefined}
    />
  )
}
