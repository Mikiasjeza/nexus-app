import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Assessments',
  description:
    'Prove a skill with a timed, hands-on task graded against hidden tests and a published rubric. Pass and get a credential anyone can check.',
}

export default function AssessmentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
