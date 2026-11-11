import { providerSummaries } from '@/lib/auth/oauth/providers'
import RegisterForm from './RegisterForm'

// Which "Continue with …" buttons to show depends on the server's settings.
export const dynamic = 'force-dynamic'

export default function RegisterPage() {
  return <RegisterForm providers={providerSummaries()} />
}
